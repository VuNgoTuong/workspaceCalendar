import React from 'react';
import { Box, Typography } from '@mui/material';
import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTitle } from '../../hooks';

interface ComingSoonProps {
  title: string;
  icon?: LucideIcon;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title, icon: Icon = Construction }) => {
  const { t } = useTranslation();
  useTitle(title, true);

  return (
    <Box className="flex flex-col items-center justify-center text-center py-24 px-6 min-h-[60vh]">
      <Box className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-[#00529C]/10 text-[#00529C] dark:bg-blue-500/15 dark:text-blue-400">
        <Icon size={28} strokeWidth={1.5} />
      </Box>
      <Typography className="!text-xl !font-bold text-slate-800 dark:text-slate-100 mb-2">
        {title}
      </Typography>
      <Typography className="!text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        {t('coming_soon.description')}
      </Typography>
    </Box>
  );
};

export default ComingSoon;
