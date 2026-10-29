import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// Jira Spaces Planet with Ring Icon
export function JiraPlanetIcon({ size = 24, color = '#8C9BAB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Back half of ring */}
      <Path
        d="M21.5 8.5C22.5 10 21.5 12 18.5 14C15.5 16 11 17.5 7 17.5C4 17.5 2 16.5 2 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Planet sphere */}
      <Circle cx="12" cy="12" r="6" fill={color} opacity={0.15} />
      <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={2} />
      {/* Front half of ring */}
      <Path
        d="M3 13.5C2 12 3 10 6 8C9 6 13.5 4.5 17.5 4.5C20.5 4.5 22.5 5.5 22.5 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Jira Dashboard / Board Icon (Split Kanban panel)
export function JiraBoardIcon({ size = 24, color = '#8C9BAB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M12 3V21" stroke={color} strokeWidth={2} />
      <Path d="M12 12H21" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Jira All Work / Checklist Icon
export function JiraWorkIcon({ size = 24, color = '#8C9BAB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M7 2L7 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 2L17 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 13L10.5 15.5L16 10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Jira Home Icon
export function JiraHomeIcon({ size = 24, color = '#8C9BAB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Jira Bell Notification Icon
export function JiraBellIcon({ size = 24, color = '#8C9BAB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21A2 2 0 0 1 10.27 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Jira User Profile Icon
export function JiraUserIcon({ size = 24, color = '#8C9BAB' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M5 20C5 16.6863 8.13401 14 12 14C15.866 14 19 16.6863 19 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Jira Equalizer / Sliders Icon (Orange space/project icon)
export function JiraSlidersIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx="4" cy="12" r="2.5" fill={color} />
      <Circle cx="12" cy="10" r="2.5" fill={color} />
      <Circle cx="20" cy="14" r="2.5" fill={color} />
    </Svg>
  );
}
