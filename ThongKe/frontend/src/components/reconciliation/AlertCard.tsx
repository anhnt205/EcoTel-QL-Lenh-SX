import type { Alert } from '@/modules/reconciliation/types/reconciliation.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AlertCardProps {
  alert: Alert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const navigate = useNavigate();
  const isCritical = alert.severity === 'CRITICAL';

  return (
    <Card
      className={`rounded-xl p-4 transition-all border shadow-2xs ${
        isCritical
          ? 'bg-destructive/10 border-destructive/20 hover:border-destructive/40'
          : 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-lg p-2 ${
              isCritical ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isCritical ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-muted border border-border font-mono text-xs font-bold text-foreground shadow-2xs">
                {alert.vehicleCode}
              </span>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isCritical
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                {alert.severity}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed font-medium">
              {alert.message}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(alert.link)}
          className="h-8 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
        >
          Chi tiết <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
