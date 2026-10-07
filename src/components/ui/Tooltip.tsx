import React from 'react';
import { Tooltip as MuiTooltip } from '@mui/material';
import type { TooltipProps as MuiTooltipProps } from '@mui/material';
import { cn } from '../../utils/helpers';

export interface TooltipProps extends MuiTooltipProps {
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  slotProps,
  ...props
}) => {
  const tooltipSlotProps = slotProps?.tooltip;
  const popperSlotProps = slotProps?.popper;

  return (
    <MuiTooltip
      {...props}
      slotProps={{
        ...slotProps,
        popper: (ownerState) => {
          const resolved =
            typeof popperSlotProps === 'function'
              ? popperSlotProps(ownerState)
              : popperSlotProps;
          return {
            ...resolved,
            modifiers: [{ name: 'offset', options: { offset: [0, props.arrow ? 10 : 6] } }, ...(resolved?.modifiers ?? [])],
          };
        },
        tooltip: (ownerState) => {
          const resolved =
            typeof tooltipSlotProps === 'function'
              ? tooltipSlotProps(ownerState)
              : tooltipSlotProps;
          return {
            ...resolved,
            className: cn(
              '!bg-white dark:!bg-slate-900 !text-slate-700 dark:!text-slate-200 !border !border-slate-200/60 dark:!border-slate-800/85 !shadow-[0_4px_16px_rgba(15,23,42,0.08)] !font-normal !text-[11.5px] !rounded-xl !px-3 !py-1.5 !m-0',
              resolved?.className
            ),
          };
        },
      }}
    >
      {children}
    </MuiTooltip>
  );
};

export default Tooltip;
