import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface DonutChartProps {
  todo: number;
  inProgress: number;
  review: number;
  done: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  todo,
  inProgress,
  review,
  done,
}) => {
  const total = todo + inProgress + review + done || 1;
  const radius = 50;
  const strokeWidth = 12;
  const center = 60;
  const circumference = 2 * Math.PI * radius;

  const donePercent = (done / total);
  const inProgressPercent = (inProgress / total);
  const reviewPercent = (review / total);
  const todoPercent = (todo / total);

  // Dash arrays
  const doneStroke = `${donePercent * circumference} ${circumference}`;
  const inProgressStroke = `${inProgressPercent * circumference} ${circumference}`;
  const reviewStroke = `${reviewPercent * circumference} ${circumference}`;
  const todoStroke = `${todoPercent * circumference} ${circumference}`;

  // Dash offsets
  const doneOffset = 0;
  const inProgressOffset = -donePercent * circumference;
  const reviewOffset = -(donePercent + inProgressPercent) * circumference;
  const todoOffset = -(donePercent + inProgressPercent + reviewPercent) * circumference;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Done (Purple) */}
            {done > 0 && (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#A855F7"
                strokeWidth={strokeWidth}
                strokeDasharray={doneStroke}
                strokeDashoffset={doneOffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
            {/* In Progress (Blue) */}
            {inProgress > 0 && (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#1A73E8"
                strokeWidth={strokeWidth}
                strokeDasharray={inProgressStroke}
                strokeDashoffset={inProgressOffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
            {/* Review (Amber) */}
            {review > 0 && (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#B06000"
                strokeWidth={strokeWidth}
                strokeDasharray={reviewStroke}
                strokeDashoffset={reviewOffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
            {/* Todo (Green) */}
            {todo > 0 && (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#137333"
                strokeWidth={strokeWidth}
                strokeDasharray={todoStroke}
                strokeDashoffset={todoOffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </G>
        </Svg>
        <View style={styles.centerTextContainer}>
          <Text style={styles.totalText}>{todo + inProgress + review + done}</Text>
          <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
        </View>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#A855F7' }]} />
          <Text style={styles.legendText}>Đã xong (Done)</Text>

          <Text style={styles.legendCount}>{done}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#1A73E8' }]} />
          <Text style={styles.legendText}>Đang làm (In Progress)</Text>

          <Text style={styles.legendCount}>{inProgress}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#B06000' }]} />
          <Text style={styles.legendText}>Đang duyệt (Review)</Text>

          <Text style={styles.legendCount}>{review}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#137333' }]} />
          <Text style={styles.legendText}>Cần làm (To Do)</Text>

          <Text style={styles.legendCount}>{todo}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  chartWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  legendCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
});
