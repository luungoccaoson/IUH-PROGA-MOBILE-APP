/**
 * Quy định màu sắc theo tiến độ hoàn thành (%):
 * - Màu đỏ: 0% đến < 30%
 * - Màu vàng: 30% đến < 70%
 * - Màu xanh dương: 70% đến < 100%
 * - Màu xanh lá cây: 100%
 */
export interface ProgressColorInfo {
  main: string;
  bg: string;
  label: string;
}

export const getProgressColor = (percent: number): ProgressColorInfo => {
  if (percent >= 100) {
    return {
      main: '#57D9A3', // Xanh lá cây (100%)
      bg: '#0D3823',
      label: 'Hoàn thành',
    };
  }
  if (percent >= 70) {
    return {
      main: '#579DFF', // Xanh dương (70% đến < 100%)
      bg: '#1D3B6A',
      label: 'Khá tốt',
    };
  }
  if (percent >= 30) {
    return {
      main: '#F59E0B', // Màu vàng (30% đến < 70%)
      bg: '#43290F',
      label: 'Đang tiến triển',
    };
  }
  return {
    main: '#EF4444', // Màu đỏ (0% đến < 30%)
    bg: '#3A1414',
    label: 'Cần đẩy nhanh',
  };
};
