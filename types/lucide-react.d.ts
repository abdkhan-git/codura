declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';

  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }

  export type Icon = FC<IconProps>;

  export const ArrowRightIcon: Icon;
  export const Calendar: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const ChevronDown: Icon;
  export const Video: Icon;
  export const Users: Icon;
  export const Clock: Icon;
  export const Code: Icon;
  export const Code2: Icon;
  export const Trophy: Icon;
  export const Target: Icon;
  export const Sparkles: Icon;
  export const TrendingUp: Icon;
  export const CheckCircle2: Icon;
  export const X: Icon;
  export const Plus: Icon;
  export const MoreVertical: Icon;
  export const User: Icon;
  export const Settings: Icon;
  export const LogOut: Icon;
  export const BarChart3: Icon;
  export const Bell: Icon;
  export const Flame: Icon;
  export const Star: Icon;
  export const Award: Icon;
  export const BookOpen: Icon;
  export const Share2: Icon;
  export const MapPin: Icon;
  export const Briefcase: Icon;
  export const GraduationCap: Icon;
  export const Github: Icon;
  export const Linkedin: Icon;
  export const Globe: Icon;
  export const Play: Icon;
  export const Send: Icon;
  export const RotateCcw: Icon;
  export const Loader2: Icon;
}
