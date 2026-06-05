import { useState, useCallback, useRef } from "react";
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Handle,
  Position,
  MarkerType,
  Connection,
  Edge,
  Node as FlowNode,
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

// ── 型定義
type BaseNode = {
  id: string;
  character: string;
  text: string;
  set_flags?: string[];
};

type AutoNode = BaseNode & {
  type: "auto";
  next: string | null;
};

type BranchNode = BaseNode & {
  type: "branch";
  choices: { label: string; next: string }[];
};

type ConditionalNode = BaseNode & {
  type: "conditional";
  conditions: { flag: string; value: boolean; next: string }[];
};

type ScenarioNode = AutoNode | BranchNode | ConditionalNode;

type Scenario = {
  start: string;
  nodes: ScenarioNode[];
};

type FlowNodeData = {
  nodeData: ScenarioNode;
};

// ── カラーパレット
const COLORS = {
  bg: "#0f0f13",
  surface: "#1a1a24",
  border: "#2e2e42",
  auto: "#3b82f6",
  branch: "#22c55e",
  conditional: "#f97316",
  text: "#e2e8f0",
  textMuted: "#64748b",
  accent: "#a78bfa",
} as const;

const TYPE_COLOR: Record<ScenarioNode["type"], string> = {
  auto: COLORS.auto,
  branch: COLORS.branch,
  conditional: COLORS.conditional,
};

const TYPE_LABEL: Record<ScenarioNode["type"], string> = {
  auto: "AUTO",
  branch: "BRANCH",
  conditional: "COND",
};

// ── カスタムノードコンポーネント
function ScenarioNodeComponent({ data, selected }: NodeProps<FlowNodeData>) {
  const { nodeData } = data;
  const color = TYPE_COLOR[nodeData.type];

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `2px solid ${selected ? color : COLORS.border}`,
        borderRadius: 10,
        minWidth: 200,
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: selected ? `0 0 20px ${color}44` : "0 4px 20px #00000066",
        transition: "all 0.15s ease",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: `${color}22`,
          borderBottom: `1px solid ${color}44`,
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            background: color,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            letterSpacing: 1,
          }}
        >
          {TYPE_LABEL[nodeData.type]}
        </span>
        <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{nodeData.id}</span>
      </div>

      <div style={{ padding: "10px 12px" }}>
        {nodeData.character && (
          <div style={{ color, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            {nodeData.character}
          </div>
        )}
        <div style={{ color: COLORS.text, fontSize: 12, lineHeight: 1.5, maxWidth: 220, wordBreak: "break-all" }}>
          {nodeData.text || (
            <span style={{ color: COLORS.textMuted, fontStyle: "italic" }}>(テキストなし)</span>
          )}
        </div>

        {(nodeData.set_flags ?? []).length > 0 && (
          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {nodeData.set_flags!.map((f) => (
              <span key={f} style={{ background: "#a78bfa22", border: "1px solid #a78bfa44", color: "#a78bfa", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>
                +{f}
              </span>
            ))}
          </div>
        )}

        {nodeData.type === "branch" && (
          <div style={{ marginTop: 8 }}>
            {nodeData.choices.map((c, i) => (
              <div key={i} style={{ color: COLORS.textMuted, fontSize: 11, borderLeft: `2px solid ${COLORS.branch}`, paddingLeft: 6, marginBottom: 2 }}>
                {c.label || `選択肢${i + 1}`}
              </div>
            ))}
          </div>
        )}

        {nodeData.type === "conditional" && (
          <div style={{ marginTop: 8 }}>
            {nodeData.conditions.map((c, i) => (
              <div key={i} style={{ color: COLORS.textMuted, fontSize: 11, borderLeft: `2px solid ${COLORS.conditional}`, paddingLeft: 6, marginBottom: 2 }}>
                {c.flag} = {c.value ? "true" : "false"}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} style={{ background: color, border: "none", width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: color, border: "none", width: 10, height: 10 }} />
    </div>
  );
}

const nodeTypes = { scenario: ScenarioNodeComponent };

// ── ユーティリティ
let nodeCounter = 1;
function genId(): string {
  return `node_${String(nodeCounter++).padStart(3, "0")}`;
}

function makeDefaultNode(type: ScenarioNode["type"]): ScenarioNode {
  const base: BaseNode = { id: genId(), character: "", text: "", set_flags: [] };
  if (type === "auto") return { ...base, type: "auto", next: null };
  if (type === "branch") return { ...base, type: "branch", choices: [{ label: "", next: "" }] };
  return { ...base, type: "conditional", conditions: [{ flag: "", value: true, next: "" }, { flag: "", value: false, next: "" }] };
}

function scenarioNodeToFlow(sn: ScenarioNode, position?: { x: number; y: number }): FlowNode<FlowNodeData> {
  return {
    id: sn.id,
    type: "scenario",
    position: position ?? { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
    data: { nodeData: sn },
  };
}

// ── スタイル定数
const inputStyle: React.CSSProperties = {
  background: "#0f0f13",
  border: "1px solid #2e2e42",
  borderRadius: 6,
  color: "#e2e8f0",
  fontSize: 12,
  padding: "6px 10px",
  width: "100%",
  fontFamily: "'JetBrains Mono', monospace",
  boxSizing: "border-box",
};

function btnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}22`,
    border: `1px solid ${color}66`,
    color,
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
  };
}

const smallDelBtn: React.CSSProperties = {
  background: "#ef444422",
  border: "1px solid #ef444466",
  color: "#ef4444",
  borderRadius: 4,
  padding: "4px 8px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
};

const addBtn: React.CSSProperties = {
  background: "#22222f",
  border: "1px solid #2e2e42",
  color: "#a78bfa",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 11,
  width: "100%",
  marginTop: 4,
};

// ── Fieldコンポーネント
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ color: COLORS.textMuted, fontSize: 10, letterSpacing: 1 }}>{label}</label>
      {children}
    </div>
  );
}

// ── メインApp
export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<ScenarioNode | null>(null);
  const [startId, setStartId] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const scenarioNodes = useRef<Record<string, ScenarioNode>>({});

  const addNode = useCallback((type: ScenarioNode["type"]) => {
    const sn = makeDefaultNode(type);
    scenarioNodes.current[sn.id] = sn;
    if (!startId) setStartId(sn.id);
    setNodes((ns) => [...ns, scenarioNodeToFlow(sn, { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 })]);
  }, [startId, setNodes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: FlowNode<FlowNodeData>) => {
    setSelected({ ...scenarioNodes.current[node.id] });
  }, []);

  const updateSelected = useCallback((patch: Partial<ScenarioNode>) => {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch } as ScenarioNode;
      scenarioNodes.current[next.id] = next;
      setNodes((ns) =>
        ns.map((n) => n.id === next.id ? { ...n, data: { nodeData: next } } : n)
      );
      return next;
    });
  }, [setNodes]);

  const exportJson = useCallback((): string => {
    const scenario: Scenario = {
      start: startId ?? "",
      nodes: Object.values(scenarioNodes.current),
    };
    return JSON.stringify(scenario, null, 2);
  }, [startId]);

  const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const scenario = JSON.parse((ev.target?.result as string) ?? "") as Scenario;
        if (!scenario.start || !Array.isArray(scenario.nodes)) {
          setImportError("'start' と 'nodes' が必要です");
          return;
        }
        scenarioNodes.current = {};
        scenario.nodes.forEach((sn) => { scenarioNodes.current[sn.id] = sn; });
        setNodes(scenario.nodes.map((sn) => scenarioNodeToFlow(sn)));
        setEdges([]);
        setStartId(scenario.start);
        setSelected(null);
        setImportError(null);
      } catch (err) {
        setImportError("パースエラー: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [setNodes, setEdges]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenario.json";
    a.click();
  }, [exportJson]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((es) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: COLORS.accent } }, es));
  }, [setEdges]);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    delete scenarioNodes.current[selected.id];
    setNodes((ns) => ns.filter((n) => n.id !== selected.id));
    setEdges((es: Edge[]) => es.filter((e) => e.source !== selected.id && e.target !== selected.id));
    setSelected(null);
  }, [selected, setNodes, setEdges]);

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, fontFamily: "'JetBrains Mono', monospace", color: COLORS.text }}>

      {/* 左サイドバー */}
      <div style={{ width: 200, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", padding: 16, paddingBottom: 64, gap: 8 }}>
        <div style={{ color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>NOVEL EDITOR</div>
        <div style={{ color: COLORS.textMuted, fontSize: 10, marginBottom: 4 }}>ADD NODE</div>
        {(["auto", "branch", "conditional"] as const).map((type) => (
          <button key={type} onClick={() => addNode(type)} style={btnStyle(TYPE_COLOR[type])}>
            + {TYPE_LABEL[type]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ color: COLORS.textMuted, fontSize: 10, marginBottom: 4 }}>START NODE</div>
        <input value={startId ?? ""} onChange={(e) => setStartId(e.target.value)} placeholder="node_001" style={inputStyle} />
        <button onClick={() => setShowJson(true)} style={btnStyle("#a78bfa")}>JSON プレビュー</button>
        <button onClick={downloadJson} style={btnStyle("#22c55e")}>JSON エクスポート</button>
        <label style={{ ...btnStyle("#f97316"), display: "block", cursor: "pointer" }}>
          JSON インポート
          <input type="file" accept=".json" onChange={onImportFile} style={{ display: "none" }} />
        </label>
        {importError && (
          <div style={{ color: "#ef4444", fontSize: 10, wordBreak: "break-all" }}>{importError}</div>
        )}
      </div>

      {/* メインキャンバス */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: COLORS.bg }}
        >
          <Controls style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }} />
          <Background color={COLORS.border} gap={24} />
        </ReactFlow>
      </div>

      {/* 右プロパティパネル */}
      {selected && (
        <div style={{ width: 280, background: COLORS.surface, borderLeft: `1px solid ${COLORS.border}`, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: TYPE_COLOR[selected.type], fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{TYPE_LABEL[selected.type]} NODE</span>
            <button onClick={deleteSelected} style={smallDelBtn}>削除</button>
          </div>

          <Field label="ID"><input value={selected.id} readOnly style={{ ...inputStyle, opacity: 0.5 }} /></Field>
          <Field label="CHARACTER"><input value={selected.character} onChange={(e) => updateSelected({ character: e.target.value })} style={inputStyle} /></Field>
          <Field label="TEXT"><textarea value={selected.text} onChange={(e) => updateSelected({ text: e.target.value })} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} /></Field>
          <Field label="SET FLAGS（カンマ区切り）">
            <input
              value={(selected.set_flags ?? []).join(",")}
              onChange={(e) => updateSelected({ set_flags: e.target.value ? e.target.value.split(",").map((s) => s.trim()) : [] })}
              placeholder="has_key,met_alice"
              style={inputStyle}
            />
          </Field>

          {selected.type === "auto" && (
            <Field label="NEXT（空欄=END）">
              <input value={selected.next ?? ""} onChange={(e) => updateSelected({ next: e.target.value || null })} placeholder="node_002" style={inputStyle} />
            </Field>
          )}

          {selected.type === "branch" && (
            <Field label="CHOICES">
              {selected.choices.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  <input value={c.label} onChange={(e) => { const choices = [...selected.choices]; choices[i] = { ...choices[i], label: e.target.value }; updateSelected({ choices }); }} placeholder="ラベル" style={{ ...inputStyle, flex: 1 }} />
                  <input value={c.next} onChange={(e) => { const choices = [...selected.choices]; choices[i] = { ...choices[i], next: e.target.value }; updateSelected({ choices }); }} placeholder="next" style={{ ...inputStyle, width: 80 }} />
                  <button onClick={() => updateSelected({ choices: selected.choices.filter((_, j) => j !== i) })} style={smallDelBtn}>×</button>
                </div>
              ))}
              <button onClick={() => updateSelected({ choices: [...selected.choices, { label: "", next: "" }] })} style={addBtn}>+ 追加</button>
            </Field>
          )}

          {selected.type === "conditional" && (
            <Field label="CONDITIONS">
              {selected.conditions.map((c, i) => (
                <div key={i} style={{ marginBottom: 6, background: COLORS.bg, borderRadius: 6, padding: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    <input value={c.flag} onChange={(e) => { const conditions = [...selected.conditions]; conditions[i] = { ...conditions[i], flag: e.target.value }; updateSelected({ conditions }); }} placeholder="flag名" style={{ ...inputStyle, flex: 1 }} />
                    <select value={String(c.value)} onChange={(e) => { const conditions = [...selected.conditions]; conditions[i] = { ...conditions[i], value: e.target.value === "true" }; updateSelected({ conditions }); }} style={{ ...inputStyle, width: 70 }}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={c.next} onChange={(e) => { const conditions = [...selected.conditions]; conditions[i] = { ...conditions[i], next: e.target.value }; updateSelected({ conditions }); }} placeholder="next node id" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => updateSelected({ conditions: selected.conditions.filter((_, j) => j !== i) })} style={smallDelBtn}>×</button>
                  </div>
                </div>
              ))}
              <button onClick={() => updateSelected({ conditions: [...selected.conditions, { flag: "", value: true, next: "" }] })} style={addBtn}>+ 追加</button>
            </Field>
          )}
        </div>
      )}

      {/* JSONモーダル */}
      {showJson && (
        <div onClick={() => setShowJson(false)} style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: 600, maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: COLORS.accent, fontWeight: 700 }}>scenario.json</span>
              <button onClick={() => setShowJson(false)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <pre style={{ overflowY: "auto", color: COLORS.text, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              {exportJson()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
