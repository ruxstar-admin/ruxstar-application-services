import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useStableHandler } from '@/hooks/use-stable-handler';
import { boardKey, type BoardCell, type BoardColumn, type BoardRow } from '@/lib/booking/board';
import { CELL_LOOK } from './look';

const LABEL_W = 112;
const CELL_W = 64;
const CELL_H = 52;
const HEAD_H = 36;
const GAP = Spacing.one;
const FREE: BoardCell = { state: 'free' };

interface VendorBoardProps {
  /** Courts, rooms, beds or batches, down the side. */
  rows: readonly BoardRow[];
  /** Times or days, across the top. */
  columns: readonly BoardColumn[];
  /** By `boardKey(row.key, column.key)`. Keep it memoised and change only the cells that changed, so the rest don't redraw. */
  cells: Readonly<Record<string, BoardCell>>;
  onCellPress: (row: BoardRow, column: BoardColumn) => void;
  /** Above the row names, e.g. "Court" or "Room". */
  corner?: string;
}

/** Rows against columns, scrolling sideways with the row names pinned on the left. Tap a cell to see or change it. */
export function VendorBoard({ rows, columns, cells, onCellPress, corner = '' }: VendorBoardProps) {
  const press = useStableHandler(onCellPress);
  return (
    <View style={styles.board}>
      <View style={styles.side}>
        <Text style={[styles.corner, styles.head]} numberOfLines={1}>
          {corner}
        </Text>
        {rows.map((row) => (
          <View key={row.key} style={styles.rowLabel}>
            <Text style={styles.rowName} numberOfLines={1}>
              {row.label}
            </Text>
            {row.subtitle ? (
              <Text style={styles.rowSub} numberOfLines={1}>
                {row.subtitle}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.lines}>
          <View style={styles.line}>
            {columns.map((col) => (
              <Text key={col.key} style={[styles.colName, styles.head]} numberOfLines={1}>
                {col.label}
              </Text>
            ))}
          </View>
          {rows.map((row) => (
            <BoardLine key={row.key} row={row} columns={columns} cells={cells} onPress={press} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

interface LineProps {
  row: BoardRow;
  columns: readonly BoardColumn[];
  cells: Readonly<Record<string, BoardCell>>;
  onPress: (row: BoardRow, column: BoardColumn) => void;
}

const BoardLine = memo(function BoardLine({ row, columns, cells, onPress }: LineProps) {
  return (
    <View style={styles.line}>
      {columns.map((col) => (
        <Cell key={col.key} row={row} column={col} cell={cells[boardKey(row.key, col.key)] ?? FREE} onPress={onPress} />
      ))}
    </View>
  );
});

interface CellProps {
  row: BoardRow;
  column: BoardColumn;
  cell: BoardCell;
  onPress: (row: BoardRow, column: BoardColumn) => void;
}

const Cell = memo(function Cell({ row, column, cell, onPress }: CellProps) {
  const look = CELL_LOOK[cell.state];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.label}, ${column.label}, ${look.label}${cell.label ? `, ${cell.label}` : ''}`}
      accessibilityState={{ selected: cell.state === 'selected' }}
      onPress={() => onPress(row, column)}
      style={({ pressed }) => [styles.cell, { backgroundColor: look.bg, borderColor: look.border }, look.dashed && styles.dashed, pressed && styles.pressed]}
    >
      <Ionicons name={look.icon} size={14} color={look.iconColor} />
      {cell.label ? (
        <Text style={[styles.cellText, { color: look.text }]} numberOfLines={1}>
          {cell.label}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  board: { flexDirection: 'row' },
  side: { width: LABEL_W, gap: GAP, paddingRight: Spacing.two },
  head: { height: HEAD_H, lineHeight: HEAD_H },
  corner: { ...Typography.overline, fontSize: 11, color: Brand.textMuted },
  rowLabel: { height: CELL_H, justifyContent: 'center' },
  rowName: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  rowSub: { ...Typography.caption, fontSize: 11, color: Brand.textMuted },
  scroll: { paddingRight: Spacing.three },
  lines: { gap: GAP },
  line: { flexDirection: 'row', gap: GAP },
  colName: { width: CELL_W, ...Typography.caption, fontSize: 12, color: Brand.textMuted, textAlign: 'center' },
  cell: { width: CELL_W, height: CELL_H, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  dashed: { borderStyle: 'dashed' },
  pressed: { opacity: 0.7 },
  cellText: { ...Typography.caption, fontSize: 11 },
});
