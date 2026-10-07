import dayjs, { type Dayjs } from 'dayjs';

export const toApiDateTime = (date: string, time: string): string => dayjs(`${date}T${time}:00`).toISOString();

export const fromApiDateTime = (value: string): Dayjs => dayjs.utc(value).local();
