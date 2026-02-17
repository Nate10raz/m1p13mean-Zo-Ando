export interface NavItem {
  displayName?: string;
  iconName?: string;
  navCap?: string;
  route?: string;
  children?: NavItem[];
  roles?: string[];
  chip?: boolean;
  chipContent?: string;
  chipClass?: string;
  external?: boolean;
}
