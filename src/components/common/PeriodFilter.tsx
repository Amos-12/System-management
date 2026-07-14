import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export interface PeriodRange {
  preset: PeriodPreset;
  start: Date;
  end: Date; // exclusive
}

export function computeRange(preset: PeriodPreset, customStart?: Date, customEnd?: Date): PeriodRange {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      end.setDate(end.getDate() + 1);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      // end stays at today 00:00
      break;
    case 'week': {
      // Monday -> Sunday
      const day = start.getDay(); // 0 sun ... 6 sat
      const diff = (day + 6) % 7; // days since Monday
      start.setDate(start.getDate() - diff);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 7);
      break;
    }
    case 'month':
      start.setDate(1);
      end.setTime(start.getTime());
      end.setMonth(end.getMonth() + 1);
      break;
    case 'year':
      start.setMonth(0, 1);
      end.setTime(start.getTime());
      end.setFullYear(end.getFullYear() + 1);
      break;
    case 'custom':
      if (customStart) {
        start.setTime(customStart.getTime());
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end.setTime(customEnd.getTime());
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
      }
      break;
  }
  return { preset, start, end };
}

interface Props {
  value: PeriodRange;
  onChange: (r: PeriodRange) => void;
  className?: string;
}

export const PeriodFilter = ({ value, onChange, className }: Props) => {
  const labelEnd = useMemo(() => {
    const e = new Date(value.end);
    e.setDate(e.getDate() - 1);
    return e;
  }, [value.end]);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select
        value={value.preset}
        onValueChange={(v) => onChange(computeRange(v as PeriodPreset))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Aujourd'hui</SelectItem>
          <SelectItem value="yesterday">Hier</SelectItem>
          <SelectItem value="week">Cette semaine</SelectItem>
          <SelectItem value="month">Ce mois</SelectItem>
          <SelectItem value="year">Cette année</SelectItem>
          <SelectItem value="custom">Personnalisée</SelectItem>
        </SelectContent>
      </Select>

      {value.preset === 'custom' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(value.start, 'dd/MM/yyyy', { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.start}
                onSelect={(d) => d && onChange(computeRange('custom', d, labelEnd))}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(labelEnd, 'dd/MM/yyyy', { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={labelEnd}
                onSelect={(d) => d && onChange(computeRange('custom', value.start, d))}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
};

export const defaultPeriod = (): PeriodRange => computeRange('today');
