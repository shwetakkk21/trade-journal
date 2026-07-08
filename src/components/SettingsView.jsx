import { AddSheetForm } from './AddSheetForm';
import { LinkedSheetsList } from './LinkedSheetsList';

export function SettingsView({
  newLink,
  onPickWorkbook,
  onSubmitLink,
  linkedSheets,
  onDeleteSheet,
  syncing,
}) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      <AddSheetForm
        newLink={newLink}
        onPickWorkbook={onPickWorkbook}
        onSubmit={onSubmitLink}
        syncing={syncing}
      />
      <LinkedSheetsList
        linkedSheets={linkedSheets}
        onDelete={onDeleteSheet}
        syncing={syncing}
      />
    </div>
  );
}
