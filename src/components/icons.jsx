import { forwardRef } from "react"
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpRightIcon,
  ArrowUturnLeftIcon,
  Bars3Icon,
  BoltIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleStackIcon,
  ClockIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PencilSquareIcon,
  PhoneArrowUpRightIcon,
  PlayIcon,
  ShareIcon,
  ShieldCheckIcon,
  SignalIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  Square2StackIcon,
  TrashIcon,
  UserGroupIcon,
  UserIcon,
  UserPlusIcon,
  WifiIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"

function makeIcon(Icon, name) {
  const SentinelIcon = forwardRef(function SentinelIcon(
    { size = 24, ...props },
    ref,
  ) {
    return <Icon ref={ref} width={size} height={size} {...props} />
  })

  SentinelIcon.displayName = name
  return SentinelIcon
}

export const Activity = makeIcon(ChartBarIcon, "Activity")
export const ArrowLeft = makeIcon(ArrowLeftIcon, "ArrowLeft")
export const ArrowRight = makeIcon(ArrowRightIcon, "ArrowRight")
export const ArrowUpRight = makeIcon(ArrowUpRightIcon, "ArrowUpRight")
export const BookOpen = makeIcon(BookOpenIcon, "BookOpen")
export const CalendarClock = makeIcon(CalendarDaysIcon, "CalendarClock")
export const CalendarDays = makeIcon(CalendarDaysIcon, "CalendarDays")
export const Check = makeIcon(CheckIcon, "Check")
export const CheckCircle2 = makeIcon(CheckCircleIcon, "CheckCircle2")
export const ChevronDown = makeIcon(ChevronDownIcon, "ChevronDown")
export const CircleAlert = makeIcon(ExclamationCircleIcon, "CircleAlert")
export const CircleX = makeIcon(XCircleIcon, "CircleX")
export const Clock3 = makeIcon(ClockIcon, "Clock3")
export const Coins = makeIcon(CircleStackIcon, "Coins")
export const Copy = makeIcon(Square2StackIcon, "Copy")
export const Download = makeIcon(ArrowDownTrayIcon, "Download")
export const ExternalLink = makeIcon(ArrowTopRightOnSquareIcon, "ExternalLink")
export const FileText = makeIcon(DocumentTextIcon, "FileText")
export const Globe2 = makeIcon(GlobeAltIcon, "Globe2")
export const Headphones = makeIcon(SpeakerWaveIcon, "Headphones")
export const Info = makeIcon(InformationCircleIcon, "Info")
export const Link2 = makeIcon(LinkIcon, "Link2")
export const LoaderCircle = makeIcon(ArrowPathIcon, "LoaderCircle")
export const LogOut = makeIcon(ArrowRightStartOnRectangleIcon, "LogOut")
export const Menu = makeIcon(Bars3Icon, "Menu")
export const Pause = makeIcon(PauseIcon, "Pause")
export const Pencil = makeIcon(PencilSquareIcon, "Pencil")
export const PhoneCall = makeIcon(PhoneArrowUpRightIcon, "PhoneCall")
export const PhoneOutgoing = makeIcon(PhoneArrowUpRightIcon, "PhoneOutgoing")
export const Play = makeIcon(PlayIcon, "Play")
export const RefreshCw = makeIcon(ArrowPathIcon, "RefreshCw")
export const RotateCcw = makeIcon(ArrowUturnLeftIcon, "RotateCcw")
export const Search = makeIcon(MagnifyingGlassIcon, "Search")
export const Settings = makeIcon(Cog6ToothIcon, "Settings")
export const Share2 = makeIcon(ShareIcon, "Share2")
export const ShieldCheck = makeIcon(ShieldCheckIcon, "ShieldCheck")
export const Sparkles = makeIcon(SparklesIcon, "Sparkles")
export const SquareTerminal = makeIcon(CommandLineIcon, "SquareTerminal")
export const Trash2 = makeIcon(TrashIcon, "Trash2")
export const UserRound = makeIcon(UserIcon, "UserRound")
export const UserRoundCheck = makeIcon(CheckBadgeIcon, "UserRoundCheck")
export const UserPlus = makeIcon(UserPlusIcon, "UserPlus")
export const UsersRound = makeIcon(UserGroupIcon, "UsersRound")
export const Volume2 = makeIcon(SpeakerWaveIcon, "Volume2")
export const Waves = makeIcon(SignalIcon, "Waves")
export const Wifi = makeIcon(WifiIcon, "Wifi")
export const X = makeIcon(XMarkIcon, "X")
export const Zap = makeIcon(BoltIcon, "Zap")
