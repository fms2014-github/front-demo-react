import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as yaml from 'js-yaml';

// Mock data - in a real app, this would be fetched dynamically.
const allSpringProperties = [
  { name: 'server.port', description: 'Server HTTP port.' },
  { name: 'server.address', description: 'Network address to bind to.' },
  { name: 'server.ssl.key-store', description: 'Path to the key store.' },
  { name: 'spring.application.name', description: 'The name of the application.' },
  { name: 'spring.datasource.url', description: 'JDBC URL of the database.' },
  { name: 'spring.datasource.username', description: 'Login username of the database.' },
  { name: 'spring.datasource.password', description: 'Login password of the database.' },
  { name: 'spring.datasource.driver-class-name', description: 'Fully qualified name of the JDBC driver.' },
  { name: 'spring.datasource.hikari.auto-commit', description: 'Controls the default auto-commit behavior.' },
  { name: 'spring.datasource.hikari.connection-timeout', description: 'Maximum time to wait for a connection from the pool.' },
  { name: 'spring.datasource.hikari.idle-timeout', description: 'Maximum amount of time that a connection is allowed to sit idle in the pool.' },
  { name: 'spring.datasource.hikari.max-lifetime', description: 'Maximum lifetime of a connection in the pool.' },
  { name: 'spring.datasource.hikari.maximum-pool-size', description: 'Maximum size that the pool is allowed to reach.' },
  { name: 'spring.datasource.hikari.minimum-idle', description: 'Minimum number of idle connections that HikariCP tries to maintain.' },
  { name: 'spring.datasource.hikari.pool-name', description: 'The name to assign to the connection pool.' },
  { name: 'spring.jpa.hibernate.ddl-auto', description: 'DDL mode (e.g., none, validate, update, create, create-drop).' },
  { name: 'spring.jpa.properties.hibernate.dialect', description: 'Specifies the Hibernate dialect for the target database.' },
  { name: 'spring.jpa.show-sql', description: 'Enable logging of SQL statements.' },
  { name: 'logging.level.root', description: 'Log level for the root logger (e.g., INFO, DEBUG, WARN).' },
  { name: 'logging.level.org.springframework', description: 'Log level for Spring framework.' },
  { name: 'management.endpoints.web.exposure.include', description: 'Comma-separated list of actuator endpoints to expose.' },
  { name: 'mybatis.mapper-locations', description: 'Locations of MyBatis mapper XML files.' },
  { name: 'mybatis.type-aliases-package', description: 'Package to scan for type aliases.' },
  { name: 'mybatis.configuration.map-underscore-to-camel-case', description: 'Whether to map underscore-case column names to camel-case property names.' },
  { name: 'mybatis.configuration.log-impl', description: 'MyBatis logging implementation (e.g., SLF4J, STDOUT_LOGGING).'},
];

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
interface PropertyNodeProps {
  node: PropertyNode;
  selectedProperties: Property[];
  onValueChange: (name: string, value: string) => void;
  onAddProperty: (name:string) => void;
  onRemoveProperty: (name: string) => void;
}

const PropertyNodeView: React.FC<PropertyNodeProps> = ({ node, selectedProperties, onValueChange, onAddProperty, onRemoveProperty }) => {
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
          {Object.values(node.children).map(child => <PropertyNodeView key={child.path} {...{node: child, selectedProperties, onValueChange, onAddProperty, onRemoveProperty}} />)}
        </div>
      )}
    </div>
  );
};

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
    const filtered = searchTerm ? allSpringProperties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) : allSpringProperties;
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
             {Object.values(propertyTree).map(node => <PropertyNodeView key={node.path} {...{node, selectedProperties, onValueChange: handlePropertyValueChange, onAddProperty: handleAddProperty, onRemoveProperty: handleRemoveProperty}} />)}
          </div>
      </div>
    </div>
  );
};

export default YamlGenerator;