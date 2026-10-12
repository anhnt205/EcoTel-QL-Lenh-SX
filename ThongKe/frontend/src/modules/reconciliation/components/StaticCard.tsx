export type CardFilterType = "all" | "pending" | "approved" | "not_approved" | "matched" | "mismatch";
export type KpiCardConfig = {
    key: CardFilterType;
    label: string;
    icon: React.ElementType;
    value: number;
    suffix?: string; // "chuyến" hoặc "%"
    colorClasses: {
        active: string;
        iconBg: string;
        label: string;
        value: string;
        hover: string;
    };
};

export const KpiCard: React.FC<{ config: KpiCardConfig; isActive: boolean; onClick: () => void }> = ({
                                                                                                  config,
                                                                                                  isActive,
                                                                                                  onClick,
                                                                                              }) => {
    const Icon = config.icon;
    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 select-none ${
                isActive
                    ? config.colorClasses.active
                    : `bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs ${config.colorClasses.hover}`
            }`}
        >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.colorClasses.iconBg}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider truncate ${config.colorClasses.label}`}>
                    {config.label}
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-lg font-extrabold ${config.colorClasses.value}`}>{config.value}</span>
                    <span className={`text-[11px] font-medium ${config.colorClasses.label}`}>
            {config.suffix ?? "chuyến"}
          </span>
                </div>
            </div>
        </div>
    );
};