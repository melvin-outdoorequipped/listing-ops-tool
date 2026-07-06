// lib/task-processing.ts
import { Task } from '../components/components/dashboard-utils'; // adjust to your actual import path

export function processTasksFromSheet(sheetData: any): Task[] {
  let headers: string[];
  let rowData: { row: any[]; rowIndex: number }[];

  if (sheetData && typeof sheetData === 'object' && sheetData.headers && sheetData.rows) {
    headers = sheetData.headers;
    rowData = sheetData.rows;
  } else if (Array.isArray(sheetData) && sheetData.length > 0) {
    headers = sheetData[0] || [];
    const rows = sheetData.slice(1) || [];
    rowData = rows.map((row, index) => ({
      row,
      rowIndex: index + 2,
    }));
  } else {
    return [];
  }

  if (!headers || headers.length === 0 || rowData.length === 0) {
    return [];
  }

  const columnMap: { [key: string]: number } = {};
  headers.forEach((header: string, index: number) => {
    if (header) {
      const key = header.toString().trim().toLowerCase();
      if (!(key in columnMap)) {
        columnMap[key] = index;
      }
    }
  });

  const taskCol = columnMap['task'];
  const statusCol = columnMap['status'];
  const dateRequestedCol = columnMap['date requested'];
  const dateAssignedCol = columnMap['date assigned']; // <-- now read from its own column
  const dueDateCol = columnMap['due date'];
  const dateCompletedCol = columnMap['date completed'];
  const tatCol = columnMap['tat'];
  const segmentCol = columnMap['segment'];
  const typeCol = columnMap['type'];
  const brandCol = columnMap['brand'];
  const agentCol = columnMap['agent'];
  const remarksCol = columnMap['remarks'];
  const auditorCol = columnMap['auditor'];
  const bcLinksCol = columnMap['bc links'] ?? columnMap['bc link'];
  const reasonPendingCol = columnMap['reason for pending'];
  const reasonCancelCol = columnMap['reason for cancel'];

  if (taskCol === undefined) {
    return [];
  }

  const get = (row: any[], idx: number | undefined) =>
    idx !== undefined && idx < row.length ? (row[idx] ?? '') : '';

  const taskList: Task[] = [];

  rowData.forEach(({ row, rowIndex }: { row: any[]; rowIndex: number }) => {
    const taskName = get(row, taskCol);
    if (!taskName || taskName.toString().trim() === '') {
      return;
    }

    taskList.push({
      id: `task-${rowIndex}`,
      rowIndex: rowIndex,
      date_requested: get(row, dateRequestedCol).toString(),
      tat: get(row, tatCol).toString(),
      segment: get(row, segmentCol).toString(),
      type: get(row, typeCol).toString(),
      task: taskName.toString(),
      brand: get(row, brandCol).toString(),
      date_assigned: get(row, dateAssignedCol).toString(), // <-- fixed: no longer reuses dateRequestedCol
      agent: get(row, agentCol).toString(),
      due_date: get(row, dueDateCol).toString(),
      date_completed: get(row, dateCompletedCol).toString() || null,
      remarks: get(row, remarksCol).toString(),
      auditor: get(row, auditorCol).toString(),
      status: get(row, statusCol).toString() || 'Pending',
      bc_links: get(row, bcLinksCol).toString(),
      reason_for_pending: get(row, reasonPendingCol).toString(),
      reason_for_cancel: get(row, reasonCancelCol).toString(),
      isNew: false,
    });
  });

  return taskList;
}