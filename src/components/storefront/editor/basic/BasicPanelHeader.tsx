export function BasicPanelHeader({
  title,
  breadcrumb,
  help,
}: {
  title: string;
  breadcrumb?: string;
  help?: string;
}) {
  return (
    <div className="border-b border-gray-200 p-4 dark:border-gray-800">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      {breadcrumb ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{breadcrumb}</p> : null}
      {help ? <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{help}</p> : null}
    </div>
  );
}
