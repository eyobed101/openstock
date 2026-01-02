export const useSidebar = () => {
    const isOpen = useState('sidebar-open', () => false);
    const isCollapsed = useState('sidebar-collapsed', () => false);

    const toggleSidebar = () => {
        isOpen.value = !isOpen.value;
    };

    const toggleCollapse = () => {
        isCollapsed.value = !isCollapsed.value;
    };

    const closeSidebar = () => {
        isOpen.value = false;
    };

    return {
        isOpen,
        isCollapsed,
        toggleSidebar,
        toggleCollapse,
        closeSidebar,
    };
};
