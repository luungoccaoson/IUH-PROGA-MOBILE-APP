import { Task, TaskStatus, User, SpaceRoleType } from '../types';

export type CanonicalTaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export function normalizeTaskStatus(status?: TaskStatus | string): CanonicalTaskStatus {
  if (status === 'DONE') return 'DONE';
  if (status === 'IN_REVIEW' || status === 'REVIEW') return 'IN_REVIEW';
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'TODO';
}

export function isTaskInReview(status?: TaskStatus | string): boolean {
  return status === 'IN_REVIEW' || status === 'REVIEW';
}

export function getUserSpaceRole(
  userId?: number,
  workspaceOwnerId?: number,
  memberRoleId?: number
): SpaceRoleType {
  if (userId && workspaceOwnerId && userId === workspaceOwnerId) {
    return 'PM';
  }
  if (memberRoleId === 1 || memberRoleId === 2) {
    return 'PM';
  }
  if (memberRoleId === 4) {
    return 'ASSISTANT';
  }
  return 'MEMBER';
}

export function checkStatusTransitionPermission(
  task: Task,
  targetRawStatus: TaskStatus,
  role: SpaceRoleType,
  currentUserId?: number
): { allowed: boolean; reasonKey?: string } {
  const currentStatus = normalizeTaskStatus(task.status);
  const targetStatus = normalizeTaskStatus(targetRawStatus);

  if (currentStatus === targetStatus) {
    return { allowed: false };
  }

  const taskOwnerId = task.ownerId || task.assignee?.id;
  const isMyTask = Boolean(currentUserId && taskOwnerId === currentUserId);

  // 1. Task already DONE: locked for MEMBER and ASSISTANT
  if (currentStatus === 'DONE' && role !== 'PM') {
    return {
      allowed: false,
      reasonKey: 'Công việc đã hoàn thành (Đã xong) và bị khóa trạng thái. Chỉ PM mới có quyền mở lại.',
    };
  }

  // 2. MEMBER permissions:
  // - Only allowed on own tasks
  // - Only allowed between TODO, IN_PROGRESS, and IN_REVIEW (Chờ duyệt)
  // - Cannot move to DONE
  if (role === 'MEMBER') {
    if (!isMyTask) {
      return {
        allowed: false,
        reasonKey: 'Thành viên chỉ được chuyển trạng thái công việc của chính mình. Nếu việc chưa giao, hãy bấm "+ Nhận việc" trước.',
      };
    }
    if (targetStatus === 'DONE') {
      return {
        allowed: false,
        reasonKey: 'Thành viên không được chuyển trực tiếp sang "Đã xong". Vui lòng chuyển sang "Chờ duyệt" để PM nghiệm thu.',
      };
    }
    return { allowed: true };
  }

  // 3. ASSISTANT permissions:
  // - Never allowed to move any task to DONE
  // - On own tasks: can move between TODO, IN_PROGRESS, IN_REVIEW
  // - On other members' tasks: from IN_REVIEW can return to IN_PROGRESS (Yêu cầu sửa) or mark "Đạt yêu cầu"
  if (role === 'ASSISTANT') {
    if (targetStatus === 'DONE') {
      return {
        allowed: false,
        reasonKey: 'Trợ lý (Assistant) chỉ được đánh dấu "Đạt yêu cầu" ở cột Chờ duyệt, không có quyền duyệt sang "Đã xong" (chỉ PM mới được duyệt Đã xong).',
      };
    }
    if (isMyTask) {
      return { allowed: true };
    }
    if (currentStatus === 'IN_REVIEW' && targetStatus === 'IN_PROGRESS') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reasonKey: 'Với công việc của thành viên khác, Trợ lý chỉ được đánh dấu "Đạt yêu cầu" hoặc trả từ "Chờ duyệt" về "Đang làm".',
    };
  }

  // 4. PM permissions:
  // - On own tasks or unassigned tasks: full transition access
  // - On other members' tasks:
  //   - From IN_REVIEW: can approve to DONE or return to IN_PROGRESS
  //   - From DONE: can reopen to IN_PROGRESS or TODO
  if (role === 'PM') {
    if (isMyTask || !taskOwnerId) {
      return { allowed: true };
    }
    if (currentStatus === 'IN_REVIEW') {
      if (targetStatus === 'DONE' || targetStatus === 'IN_PROGRESS') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reasonKey: 'Với công việc đang Chờ duyệt của thành viên, PM chỉ duyệt sang "Đã xong" hoặc trả về "Đang làm".',
      };
    }
    if (currentStatus === 'DONE') {
      if (targetStatus === 'IN_PROGRESS' || targetStatus === 'TODO') {
        return { allowed: true };
      }
    }
    return {
      allowed: false,
      reasonKey: 'Thành viên phụ trách cần tự thực hiện và gửi sang "Chờ duyệt" trước khi PM duyệt sang "Đã xong".',
    };
  }

  return { allowed: false, reasonKey: 'Thao tác không được phép.' };
}

/**
 * ============================================================================
 * CHECKLIST & ASSISTANT VERIFIED PARSER / SERIALIZER (COMPATIBLE WITH WEB)
 * ============================================================================
 */
export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ParsedTaskDescription {
  baseDescription: string;
  checklist: TaskChecklistItem[];
  aiRationale?: string;
  assistantVerified: boolean;
  createdByUserId?: number;
}

const CHECKLIST_HEADER = '### 📋 Các bước thực hiện:';
const LEGACY_CHECKLIST_HEADER = '### 📋 Các bước thực hiện (Checklist):';
const RATIONALE_PREFIX = '> 💡 Cơ sở gợi ý:';
const LEGACY_RATIONALE_PREFIX = '> 💡 Căn cứ phân rã AI:';
export const ASSISTANT_VERIFIED_TAG = '[✓ Assistant đã kiểm tra & đề xuất duyệt]';
const CREATED_BY_REGEX = /\[CreatedBy:(\d+)\]/;

export function parseTaskDescriptionWithChecklist(
  rawDescription?: string
): ParsedTaskDescription {
  if (!rawDescription) {
    return { baseDescription: '', checklist: [], assistantVerified: false };
  }

  let working = rawDescription;
  let assistantVerified = false;
  let createdByUserId: number | undefined;

  const createdMatch = working.match(CREATED_BY_REGEX);
  if (createdMatch && createdMatch[1]) {
    createdByUserId = parseInt(createdMatch[1], 10);
    working = working.replace(CREATED_BY_REGEX, '').trim();
  }

  if (working.includes(ASSISTANT_VERIFIED_TAG)) {
    assistantVerified = true;
    working = working.replace(ASSISTANT_VERIFIED_TAG, '').trim();
  }

  let headerIndex = working.indexOf(CHECKLIST_HEADER);
  let headerLen = CHECKLIST_HEADER.length;
  if (headerIndex === -1) {
    headerIndex = working.indexOf(LEGACY_CHECKLIST_HEADER);
    headerLen = LEGACY_CHECKLIST_HEADER.length;
  }

  if (headerIndex === -1) {
    return {
      baseDescription: working.trim(),
      checklist: [],
      assistantVerified,
      createdByUserId,
    };
  }

  const baseDescription = working.substring(0, headerIndex).trim();
  const checklistSection = working.substring(headerIndex + headerLen).trim();

  const lines = checklistSection.split(/\r?\n/);
  const checklist: TaskChecklistItem[] = [];
  let aiRationale: string | undefined;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(RATIONALE_PREFIX)) {
      aiRationale = trimmed.replace(RATIONALE_PREFIX, '').trim();
      return;
    }
    if (trimmed.startsWith(LEGACY_RATIONALE_PREFIX)) {
      aiRationale = trimmed.replace(LEGACY_RATIONALE_PREFIX, '').trim();
      return;
    }
    const match = trimmed.match(/^-\s*\[(x|X|\s)\]\s*(.+)$/);
    if (match) {
      checklist.push({
        id: `step-${idx}-${Date.now()}`,
        completed: match[1].toLowerCase() === 'x',
        text: match[2].trim(),
      });
    }
  });

  return {
    baseDescription,
    checklist,
    aiRationale,
    assistantVerified,
    createdByUserId,
  };
}

export function serializeTaskDescriptionWithChecklist(
  baseDescription: string,
  checklist: TaskChecklistItem[],
  aiRationale?: string,
  options?: { assistantVerified?: boolean; createdByUserId?: number }
): string {
  const parts: string[] = [];

  if (options?.createdByUserId) {
    parts.push(`[CreatedBy:${options.createdByUserId}]`);
  }
  if (options?.assistantVerified) {
    parts.push(ASSISTANT_VERIFIED_TAG);
  }
  if (baseDescription.trim()) {
    parts.push(baseDescription.trim());
  }

  if (checklist && checklist.length > 0) {
    const checklistLines = checklist.map(
      (item) => `- [${item.completed ? 'x' : ' '}] ${item.text.trim()}`
    );
    const rationaleLine = aiRationale ? `${RATIONALE_PREFIX} ${aiRationale}\n` : '';
    parts.push(`${CHECKLIST_HEADER}\n${rationaleLine}${checklistLines.join('\n')}`);
  }

  return parts.join('\n\n').trim();
}

/**
 * ============================================================================
 * AUTO-ASSIGN ENGINE (SKILL MATCHING + WORKLOAD BALANCING)
 * ============================================================================
 */
export type RoleCategory =
  | 'FRONTEND'
  | 'BACKEND'
  | 'FULLSTACK'
  | 'QA'
  | 'DEVOPS'
  | 'MANAGEMENT'
  | 'GENERAL';

export interface TaskAssignmentResult {
  taskId: number;
  taskTitle: string;
  sprintId?: number | null;
  assignedMember: User;
  roleReason: string;
  category: RoleCategory;
}

export interface AutoAssignSummary {
  assignments: { taskId: number; ownerId: number }[];
  preview: TaskAssignmentResult[];
  memberStats: {
    member: User;
    count: number;
    existingOpenCount: number;
    existingDoneCount: number;
    assignedTasks: TaskAssignmentResult[];
  }[];
  totalAssigned: number;
}

function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getMemberCapabilities(user: User) {
  const text = normalizeText(
    `${user.jobTitle || ''} ${user.bio || ''} ${user.fullName || ''} ${user.username || ''}`
  );

  const isFullstack =
    text.includes('fullstack') ||
    text.includes('full-stack') ||
    text.includes('full stack');

  const isFrontend =
    isFullstack ||
    text.includes('frontend') ||
    text.includes('front-end') ||
    text.includes('fe') ||
    text.includes('react') ||
    text.includes('next') ||
    text.includes('ui') ||
    text.includes('ux') ||
    text.includes('mobile');

  const isBackend =
    isFullstack ||
    text.includes('backend') ||
    text.includes('back-end') ||
    text.includes('be') ||
    text.includes('java') ||
    text.includes('spring') ||
    text.includes('node') ||
    text.includes('api') ||
    text.includes('database') ||
    text.includes('csdl');

  const isQA =
    text.includes('qa') ||
    text.includes('qc') ||
    text.includes('tester') ||
    text.includes('test') ||
    text.includes('kiem thu') ||
    text.includes('chat luong');

  const isDevOps =
    text.includes('devops') ||
    text.includes('system') ||
    text.includes('cloud') ||
    text.includes('ha tang') ||
    text.includes('docker') ||
    text.includes('architect');

  const isManagement =
    text.includes('pm') ||
    text.includes('project manager') ||
    text.includes('scrum master') ||
    text.includes('ba') ||
    text.includes('business analyst') ||
    text.includes('phan tich') ||
    text.includes('quan ly');

  return {
    isFrontend,
    isBackend,
    isFullstack,
    isQA,
    isDevOps,
    isManagement,
  };
}

export function detectTaskCategory(task: Task): {
  category: RoleCategory;
  reason: string;
} {
  const normTitle = normalizeText(task.title);
  const normDesc = normalizeText(task.description);
  const fullContent = `${normTitle} ${normDesc}`;

  const feKeywords = ['giao dien', 'frontend', 'ui', 'ux', 'react', 'next', 'css', 'tailwind', 'component', 'modal', 'page', 'kanban', 'man hinh', 'hien thi', 'layout', 'mobile'];
  const beKeywords = ['backend', 'api', 'rest', 'service', 'database', 'csdl', 'schema', 'postgres', 'controller', 'microservice', 'jwt', 'auth', 'entity', 'repository'];
  const qaKeywords = ['kiem thu', 'test', 'qa', 'qc', 'e2e', 'unit test', 'bug', 'loi', 'chat luong', 'kiem tra'];
  const devopsKeywords = ['docker', 'container', 'ci/cd', 'pipeline', 'deploy', 'trien khai', 'cloud', 'server', 'ha tang', 'gateway'];
  const mgmtKeywords = ['yeu cau', 'requirement', 'ba', 'ke hoach', 'bao cao', 'tai lieu', 'dac ta', 'sprint', 'wbs', 'nghiem thu'];

  const scoreFe = feKeywords.filter((k) => fullContent.includes(k)).length;
  const scoreBe = beKeywords.filter((k) => fullContent.includes(k)).length;
  const scoreQa = qaKeywords.filter((k) => fullContent.includes(k)).length;
  const scoreDevOps = devopsKeywords.filter((k) => fullContent.includes(k)).length;
  const scoreMgmt = mgmtKeywords.filter((k) => fullContent.includes(k)).length;

  const maxScore = Math.max(scoreFe, scoreBe, scoreQa, scoreDevOps, scoreMgmt);
  if (maxScore > 0) {
    if (maxScore === scoreQa) return { category: 'QA', reason: 'Khớp chuyên môn Kiểm thử (QA/QC)' };
    if (maxScore === scoreDevOps) return { category: 'DEVOPS', reason: 'Khớp chuyên môn Hạ tầng & DevOps' };
    if (maxScore === scoreFe) return { category: 'FRONTEND', reason: 'Khớp chuyên môn Giao diện (Frontend/Mobile)' };
    if (maxScore === scoreBe) return { category: 'BACKEND', reason: 'Khớp chuyên môn Dữ liệu & API (Backend)' };
    if (maxScore === scoreMgmt) return { category: 'MANAGEMENT', reason: 'Khớp chuyên môn Phân tích & Quản lý (BA/PM)' };
  }
  return { category: 'GENERAL', reason: 'Phân bổ cân bằng tải tự động' };
}

export function generateAiSubstepsForTask(task: Task): {
  steps: TaskChecklistItem[];
  rationale: string;
} {
  const { category } = detectTaskCategory(task);
  const shortTitle = task.title.trim();

  let stepTexts: string[] = [];
  switch (category) {
    case 'FRONTEND':
      stepTexts = [
        `Rà soát bố cục và yêu cầu hiển thị của "${shortTitle}"`,
        `Xây dựng giao diện và các trạng thái tương tác người dùng`,
        `Kết nối dữ liệu API và kiểm tra hiển thị thực tế`,
      ];
      break;
    case 'BACKEND':
      stepTexts = [
        `Xác định dữ liệu đầu vào/đầu ra và quy tắc xử lý cho "${shortTitle}"`,
        `Cập nhật cấu trúc dữ liệu và xây dựng dịch vụ xử lý chính`,
        `Kiểm tra kết quả phản hồi API và phân quyền truy cập`,
      ];
      break;
    case 'QA':
      stepTexts = [
        `Lập danh sách kịch bản kiểm thử cho "${shortTitle}"`,
        `Thực hiện kiểm tra các luồng chính và trường hợp ngoại lệ`,
        `Ghi nhận kết quả kiểm thử trước khi gửi duyệt`,
      ];
      break;
    default:
      stepTexts = [
        `Xác định phạm vi và yêu cầu chi tiết của "${shortTitle}"`,
        `Thực hiện các hạng mục công việc chính`,
        `Rà soát kết quả hoàn thành trước khi gửi Chờ duyệt`,
      ];
      break;
  }

  return {
    steps: stepTexts.map((text, idx) => ({
      id: `ai-step-${idx}-${Date.now()}`,
      text,
      completed: false,
    })),
    rationale: `AI gợi ý theo nhóm [${category}] • Ưu tiên ${task.priority || 'MEDIUM'}`,
  };
}

export function autoAssignTasks(
  tasks: Task[],
  members: User[],
  options: {
    unassignedOnly?: boolean;
    sprintId?: number | null | 'ALL';
  } = {}
): AutoAssignSummary {
  if (!members || members.length === 0 || !tasks || tasks.length === 0) {
    return { assignments: [], preview: [], memberStats: [], totalAssigned: 0 };
  }

  let targetTasks = tasks.filter((t) => !t.isDeleted && normalizeTaskStatus(t.status) !== 'DONE');

  if (options.sprintId !== undefined && options.sprintId !== 'ALL') {
    if (options.sprintId === null) {
      targetTasks = targetTasks.filter((t) => !t.sprintId);
    } else {
      targetTasks = targetTasks.filter((t) => t.sprintId === options.sprintId);
    }
  }

  if (options.unassignedOnly) {
    targetTasks = targetTasks.filter((t) => !t.ownerId && !t.assignee?.id);
  }

  const targetTaskIds = new Set(targetTasks.map((t) => t.id));
  const existingOpenByMember: Record<number, number> = {};
  const existingDoneByMember: Record<number, number> = {};

  members.forEach((m) => {
    const memberExistingTasks = tasks.filter(
      (t) =>
        !t.isDeleted &&
        !targetTaskIds.has(t.id) &&
        (t.ownerId === m.id || t.assignee?.id === m.id)
    );
    existingOpenByMember[m.id] = memberExistingTasks.filter(
      (t) => normalizeTaskStatus(t.status) !== 'DONE'
    ).length;
    existingDoneByMember[m.id] = memberExistingTasks.filter(
      (t) => normalizeTaskStatus(t.status) === 'DONE'
    ).length;
  });

  const memberWorkload: Record<number, number> = {};
  members.forEach((m) => {
    memberWorkload[m.id] = existingOpenByMember[m.id] || 0;
  });

  const categoryShortLabel: Record<RoleCategory, string> = {
    FRONTEND: 'Frontend & UI',
    BACKEND: 'Backend & API',
    FULLSTACK: 'Fullstack',
    QA: 'Kiểm thử (QA)',
    DEVOPS: 'DevOps & Hạ tầng',
    MANAGEMENT: 'Phân tích & Quản lý',
    GENERAL: 'Đa năng',
  };

  const previewResults: TaskAssignmentResult[] = [];
  const assignments: { taskId: number; ownerId: number }[] = [];

  for (const task of targetTasks) {
    const { category } = detectTaskCategory(task);

    const scoredCandidates = members.map((m) => {
      const currentCount = memberWorkload[m.id] || 0;
      const caps = getMemberCapabilities(m);

      let roleScore = 0;
      let hasDirectSkill = false;
      if (category === 'FRONTEND' && caps.isFrontend) {
        roleScore += 12;
        hasDirectSkill = true;
      }
      if (category === 'BACKEND' && caps.isBackend) {
        roleScore += 12;
        hasDirectSkill = true;
      }
      if (category === 'QA' && caps.isQA) {
        roleScore += 12;
        hasDirectSkill = true;
      }
      if (category === 'DEVOPS' && caps.isDevOps) {
        roleScore += 12;
        hasDirectSkill = true;
      }
      if (category === 'MANAGEMENT' && caps.isManagement) {
        roleScore += 12;
        hasDirectSkill = true;
      }

      const loadPenalty = currentCount * 8;
      const zeroBonus = currentCount === 0 ? 15 : 0;

      return {
        member: m,
        hasDirectSkill,
        currentCount,
        score: zeroBonus + roleScore - loadPenalty,
      };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);
    const winner = scoredCandidates[0];
    const selectedMember = winner.member;

    const holdText =
      winner.currentCount === 0
        ? 'Đang rảnh (0 việc)'
        : `Đang giữ ${winner.currentCount} việc`;

    const finalReason =
      winner.hasDirectSkill && category !== 'GENERAL'
        ? `Khớp chuyên môn ${categoryShortLabel[category]} • ${holdText}`
        : `Cân bằng tải công việc • ${holdText}`;

    memberWorkload[selectedMember.id] = (memberWorkload[selectedMember.id] || 0) + 1;

    assignments.push({
      taskId: task.id,
      ownerId: selectedMember.id,
    });

    previewResults.push({
      taskId: task.id,
      taskTitle: task.title,
      sprintId: task.sprintId,
      assignedMember: selectedMember,
      roleReason: finalReason,
      category,
    });
  }

  const memberStats = members.map((m) => {
    const memberTasks = previewResults.filter((p) => p.assignedMember.id === m.id);
    return {
      member: m,
      count: memberTasks.length,
      existingOpenCount: existingOpenByMember[m.id] || 0,
      existingDoneCount: existingDoneByMember[m.id] || 0,
      assignedTasks: memberTasks,
    };
  });

  return {
    assignments,
    preview: previewResults,
    memberStats,
    totalAssigned: assignments.length,
  };
}
