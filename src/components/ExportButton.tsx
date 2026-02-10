import { exportCsv } from "../lib/commands";

export default function ExportButton() {
  const handleExport = async () => {
    try {
      await exportCsv();
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Please try again.");
    }
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-airbnb-dark bg-white border border-airbnb-border rounded-full hover:bg-airbnb-bg hover:shadow-sm transition-all duration-200"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Export
    </button>
  );
}
