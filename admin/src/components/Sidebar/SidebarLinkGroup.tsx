import { ReactNode, useState } from 'react';

interface SidebarLinkGroupProps {
  children: (handleClick: () => void, open: boolean) => ReactNode;
  activeCondition: boolean;
  // Kontrollü (accordion) mod: verilirse açık/kapalı durumu parent yönetir
  isOpen?: boolean;
  onToggle?: () => void;
}

const SidebarLinkGroup = ({
  children,
  activeCondition,
  isOpen,
  onToggle,
}: SidebarLinkGroupProps) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(activeCondition);
  const controlled = isOpen !== undefined;
  const open = controlled ? isOpen : internalOpen;

  const handleClick = () => {
    if (controlled) onToggle?.();
    else setInternalOpen(!internalOpen);
  };

  return <li>{children(handleClick, open)}</li>;
};

export default SidebarLinkGroup;
