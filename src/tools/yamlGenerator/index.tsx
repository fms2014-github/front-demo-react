import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as yaml from 'js-yaml';
import springPropertiesData from "../../dataset/spring.config.info.json";
import PropertyTreeView from "./components/PropertyTreeView";


// --- Helper Functions ---
const buildPropertyTree = (properties: { name: string; description: string }[]): PropertyTree => {
  const tree: PropertyTree = {};
  properties.forEach(prop => {
    const parts = prop.name.split('.');
    let currentLevel = tree;
    let currentPath = '';
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}.${part}` : part;
      if (!currentLevel[part]) {
        currentLevel[part] = { name: part, path: currentPath, children: {}, isLeaf: false };
      }
      if (index === parts.length - 1) {
        currentLevel[part].isLeaf = true;
        currentLevel[part].description = prop.description;
      }
      currentLevel = currentLevel[part].children;
    });
  });
  return tree;
};

const flattenYamlObject = (obj: any, prefix = ''): Property[] => {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            acc.push(...flattenYamlObject(obj[k], pre + k));
        } else {
            acc.push({ name: pre + k, value: String(obj[k]) });
        }
        return acc;
    }, [] as Property[]);
};


// --- Components ---


const YamlGenerator: React.FC = () => {
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const yamlOutputRef = useRef<HTMLPreElement>(null);

  const handleAddProperty = (propName: string) => {
    if (!selectedProperties.some(p => p.name === propName)) {
      setSelectedProperties([...selectedProperties, { name: propName, value: '' }]);
    }
  };

  const handleRemoveProperty = (propName: string) => setSelectedProperties(selectedProperties.filter(p => p.name !== propName));

  const handlePropertyValueChange = (propName: string, value: string) => setSelectedProperties(selectedProperties.map(p => p.name === propName ? { ...p, value } : p));

  const propertyTree = useMemo(() => {
    const filtered = searchTerm ? springPropertiesData.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) : springPropertiesData;
    return buildPropertyTree(filtered);
  }, [searchTerm]);

  const generatedYaml = useMemo(() => {
    if (selectedProperties.length === 0) return "# Add properties from the right panel";
    const yamlObject = selectedProperties.reduce((acc, prop) => {
      const keys = prop.name.split('.');
      let current = acc;
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = prop.value;
        } else {
          if (!current[key] || typeof current[key] !== 'object') current[key] = {};
          current = current[key] as Record<string, unknown>;
        }
      });
      return acc;
    }, {} as Record<string, unknown>);
    try { return yaml.dump(yamlObject); } catch (e) { return "Error generating YAML"; }
  }, [selectedProperties]);

  const handleYamlBlur = (e: React.FocusEvent<HTMLPreElement>) => {
    const newYamlText = e.currentTarget.innerText;
    try {
      const parsedObject = yaml.load(newYamlText);
      if (typeof parsedObject === 'object' && parsedObject !== null) {
        const newProperties = flattenYamlObject(parsedObject);
        // To avoid infinite loops, only update if the content has actually changed
        if (JSON.stringify(newProperties) !== JSON.stringify(selectedProperties)) {
             setSelectedProperties(newProperties);
        }
      } else {
        // Handle cases where YAML is valid but not an object (e.g. a single string)
        setSelectedProperties([]);
      }
    } catch (error) {
      console.error("Invalid YAML format:", error);
      // Optionally, show an error message to the user
    }
  };

  useEffect(() => {
    // Keep the editable pre in sync with the state, but only when it's not focused
    if (document.activeElement !== yamlOutputRef.current) {
        if(yamlOutputRef.current) {
            yamlOutputRef.current.innerText = generatedYaml;
        }
    }
  }, [generatedYaml]);

  return (
    <div className="yaml-generator-container">
      <div className="yaml-output-panel">
        <div className="yaml-header">
            <h2>application.yml</h2>
        </div>
        <pre 
            ref={yamlOutputRef}
            contentEditable
            suppressContentEditableWarning={true}
            className="yaml-content"
            onBlur={handleYamlBlur}
        />
      </div>
      <div className="control-panel">
          <h3>Available Properties</h3>
          <input type="text" placeholder="Search properties..." className="search-bar" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="property-tree-root">
             {Object.values(propertyTree).map(node => <PropertyTreeView key={node.path} {...{node, selectedProperties, onValueChange: handlePropertyValueChange, onAddProperty: handleAddProperty, onRemoveProperty: handleRemoveProperty}} />)}
          </div>
      </div>
    </div>
  );
};

export default YamlGenerator;