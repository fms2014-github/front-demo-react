
interface PropertyNodeProps {
    node: PropertyNode;
    selectedProperties: Property[];
    onValueChange: (name: string, value: string) => void;
    onAddProperty: (name:string) => void;
    onRemoveProperty: (name: string) => void;
}

// --- Type Definitions ---
interface Property {
    name: string;
    value: string;
}

interface PropertyNode {
    name: string; // e.g., 'application'
    path: string; // e.g., 'spring.application'
    description?: string;
    children: Record<string, PropertyNode>;
    isLeaf: boolean;
}

type PropertyTree = Record<string, PropertyNode>;