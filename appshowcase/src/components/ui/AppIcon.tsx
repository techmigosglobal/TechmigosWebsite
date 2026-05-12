'use client';

import React from 'react';
import {
  HomeIcon,
  PauseIcon,
  PlayIcon,
  CheckIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SignalIcon,
  WifiIcon,
  Battery100Icon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  VideoCameraIcon,
  ShieldCheckIcon,
  UsersIcon,
  QuestionMarkCircleIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

import {
  HomeIcon as HomeIconSolid,
  PauseIcon as PauseIconSolid,
  PlayIcon as PlayIconSolid,
  CheckIcon as CheckIconSolid,
  ArrowRightIcon as ArrowRightIconSolid,
  ChevronLeftIcon as ChevronLeftIconSolid,
  ChevronRightIcon as ChevronRightIconSolid,
} from '@heroicons/react/24/solid';

const iconMap: Record<string, React.ComponentType<any>> = {
  HomeIcon,
  PauseIcon,
  PlayIcon,
  CheckIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SignalIcon,
  WifiIcon,
  Battery100Icon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  VideoCameraIcon,
  ShieldCheckIcon,
  UsersIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
};

const solidIconMap: Record<string, React.ComponentType<any>> = {
  HomeIcon: HomeIconSolid,
  PauseIcon: PauseIconSolid,
  PlayIcon: PlayIconSolid,
  CheckIcon: CheckIconSolid,
  ArrowRightIcon: ArrowRightIconSolid,
  ChevronLeftIcon: ChevronLeftIconSolid,
  ChevronRightIcon: ChevronRightIconSolid,
};

type IconVariant = 'outline' | 'solid';

interface IconProps {
  name: string; // Changed to string to accept dynamic values
  variant?: IconVariant;
  size?: number;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  [key: string]: any;
}

function Icon({
  name,
  variant = 'outline',
  size = 24,
  className = '',
  onClick,
  disabled = false,
  ...props
}: IconProps) {
  const iconSet = variant === 'solid' ? solidIconMap : iconMap;
  const IconComponent = iconSet[name];

  if (!IconComponent) {
    return (
      <QuestionMarkCircleIcon
        width={size}
        height={size}
        className={`text-gray-400 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        onClick={disabled ? undefined : onClick}
        {...props}
      />
    );
  }

  return (
    <IconComponent
      width={size}
      height={size}
      className={`${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
      {...props}
    />
  );
}

export default Icon;
