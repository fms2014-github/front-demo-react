import React, { useState, useMemo, useEffect } from 'react';


const PropertyTreeView: React.FC<PropertyNodeProps> = ({ node, selectedProperties, onValueChange, onAddProperty, onRemoveProperty }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isSelected = useMemo(() => selectedProperties.some(p => p.name === node.path), [selectedProperties, node.path]);
    const hasChildren = Object.keys(node.children).length > 0;

    useEffect(() => {
        // Automatically expand if a child property is selected, this allows the tree to open
        // when the user edits the YAML text directly.
        if (hasChildren) {
            const shouldBeExpanded = selectedProperties.some(p => p.name.startsWith(node.path + '.'));
            if (shouldBeExpanded) {
                setIsExpanded(true);
            }
        }
    }, [selectedProperties, node.path, hasChildren]);

    const propertyValue = useMemo(() => selectedProperties.find(p => p.name === node.path)?.value ?? '', [selectedProperties, node.path]);

    return (
        <div className={`property-node ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''}`}>
            <div className="property-node-main">
        <span className="property-name" onClick={() => setIsExpanded(!isExpanded)}>
          {hasChildren && <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>}
            {node.name}
        </span>
                {node.isLeaf && !isSelected && <button className="add-btn" onClick={() => onAddProperty(node.path)}>Add</button>}
                {node.isLeaf && isSelected && (
                    <>
                        <span className="colon">:</span>
                        <input type="text" className="property-value-input" value={propertyValue} onChange={(e) => onValueChange(node.path, e.target.value)} placeholder="value" />
                        <button className="remove-btn" onClick={() => onRemoveProperty(node.path)}>Remove</button>
                    </>
                )}
            </div>
            {node.isLeaf && <p className="property-description">{node.description}</p>}
            {isExpanded && hasChildren && (
                <div className="property-node-children">
                    {Object.values(node.children).map(child => <PropertyTreeView key={child.path} {...{node: child, selectedProperties, onValueChange, onAddProperty, onRemoveProperty}} />)}
                </div>
            )}
        </div>
    );
};

export default PropertyTreeView;