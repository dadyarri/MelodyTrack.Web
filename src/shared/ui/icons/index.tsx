import type { LucideIcon, LucideProps } from "lucide-react";
import {
  BadgeInfo,
  BadgeRussianRuble,
  BookOpenText,
  Blocks,
  Calendar,
  CalendarCheck2,
  ChartLine,
  ChartPie,
  Check,
  CircleCheck,
  CircleDollarSign,
  CircleX,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Clock3,
  Cloud,
  CloudDownload,
  Coins,
  ContactRound,
  Copy,
  CreditCard,
  Download,
  FileSearch,
  Flame,
  FolderOpen,
  Goal,
  Hourglass,
  IdCard,
  KeyRound,
  ListTodo,
  Link,
  Lock,
  LogOut,
  Mail,
  Menu,
  Moon,
  Phone,
  Pencil,
  Plus,
  Receipt,
  RefreshCcw,
  RefreshCw,
  Search,
  Send,
  Save,
  Settings2,
  Shield,
  Sun,
  Tags,
  Trash2,
  TriangleAlert,
  Unplug,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import "./icons.css";

type MelodyIconProps = LucideProps & {
  spin?: boolean;
};

function createIcon(Component: LucideIcon) {
  return function MelodyIcon({ className, spin = false, size = "1em", strokeWidth = 2, ...props }: MelodyIconProps) {
    return (
      <Component
        {...props}
        size={size}
        strokeWidth={strokeWidth}
        className={[className, spin ? "melody-icon-spin" : null].filter(Boolean).join(" ")}
      />
    );
  };
}

export const CalendarOutlined = createIcon(Calendar);
export const CalendarCheckOutlined = createIcon(CalendarCheck2);
export const CheckCircleOutlined = createIcon(CircleCheck);
export const CheckOutlined = createIcon(Check);
export const BookOutlined = createIcon(BookOpenText);
export const CoinsOutlined = createIcon(Coins);
export const ClockCircleOutlined = createIcon(Clock3);
export const CloseCircleOutlined = createIcon(CircleX);
export const CloseOutlined = createIcon(X);
export const CloudDownloadOutlined = createIcon(CloudDownload);
export const CloudOutlined = createIcon(Cloud);
export const CloudSyncOutlined = createIcon(RefreshCw);
export const CopyOutlined = createIcon(Copy);
export const CreditCardOutlined = createIcon(CreditCard);
export const DashboardOutlined = createIcon(Blocks);
export const DeleteOutlined = createIcon(Trash2);
export const DisconnectOutlined = createIcon(Unplug);
export const DollarOutlined = createIcon(CircleDollarSign);
export const DownloadOutlined = createIcon(Download);
export const EditOutlined = createIcon(Pencil);
export const FileSearchOutlined = createIcon(FileSearch);
export const FireOutlined = createIcon(Flame);
export const FolderOpenOutlined = createIcon(FolderOpen);
export const FunnelTargetOutlined = createIcon(Goal);
export const HourglassOutlined = createIcon(Hourglass);
export const InfoCircleOutlined = createIcon(BadgeInfo);
export const KeyOutlined = createIcon(KeyRound);
export const LeftOutlined = createIcon(ChevronLeft);
export const DownOutlined = createIcon(ChevronDown);
export const LineChartOutlined = createIcon(ChartLine);
export const LinkOutlined = createIcon(Link);
export const ListTodoOutlined = createIcon(ListTodo);
export const LockOutlined = createIcon(Lock);
export const LogoutOutlined = createIcon(LogOut);
export const MailOutlined = createIcon(Mail);
export const MenuOutlined = createIcon(Menu);
export const MoneyWaveOutlined = createIcon(WalletCards);
export const MoonOutlined = createIcon(Moon);
export const PhoneOutlined = createIcon(Phone);
export const PieChartOutlined = createIcon(ChartPie);
export const PlusOutlined = createIcon(Plus);
export const ProfileOutlined = createIcon(ContactRound);
export const ReceiptOutlined = createIcon(Receipt);
export const ReloadOutlined = createIcon(RefreshCcw);
export const RightOutlined = createIcon(ChevronRight);
export const SaveOutlined = createIcon(Save);
export const UpOutlined = createIcon(ChevronUp);
export const SafetyCertificateOutlined = createIcon(Shield);
export const SearchOutlined = createIcon(Search);
export const SendOutlined = createIcon(Send);
export const SettingOutlined = createIcon(Settings2);
export const SunOutlined = createIcon(Sun);
export const SyncOutlined = createIcon(RefreshCw);
export const TagsOutlined = createIcon(Tags);
export const TeamOutlined = createIcon(Users);
export const TeamStatsOutlined = createIcon(UsersRound);
export const ToolOutlined = createIcon(Wrench);
export const UserBadgeOutlined = createIcon(IdCard);
export const UserOutlined = createIcon(UserRound);
export const WarningOutlined = createIcon(TriangleAlert);
export const WalletOutlined = createIcon(Wallet);
export const WalletStatsOutlined = createIcon(BadgeRussianRuble);
