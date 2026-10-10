/**
 * 原创微型示意图：上方是「本次模拟运行」的六个阶段，下方是「已发布指针」。
 * 用来在首页 hero 右区一眼说明「阶段可以失败，指针不因此推进」。
 */
const STAGES = ['生成', '校验', '研究', '门禁', '候选', '发布'] as const;
const WIDTH = 360;
const HEIGHT = 208;
const LEFT = 30;
const TOP = 52;
const GAP = 58;

interface Props {
  /**
   * 当前已发布指针的快照 ID。由页面传入当前状态，避免图内出现会被证伪的硬编码值：
   * 正常场景发布推进指针后，这里必须与首页统计卡、任务页指针一致。
   */
  readonly pointerRelease: string;
}

export function StagePointerDiagram({ pointerRelease }: Props) {
  return (
    <svg
      className="chart-svg"
      data-testid="home-stage-pointer-figure"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`微型阶段与指针示意图：六个阶段依次推进，任一阶段阻断时已发布指针 ${pointerRelease} 保持不变`}
    >
      <text x="0" y="16" fontSize="11" fill="rgba(244,248,251,0.72)">
        本次模拟运行
      </text>
      <line
        x1={LEFT}
        x2={LEFT + GAP * (STAGES.length - 1)}
        y1={TOP}
        y2={TOP}
        stroke="rgba(20,194,172,0.5)"
        strokeWidth="1.5"
      />
      {STAGES.map((label, index) => {
        const cx = LEFT + GAP * index;
        const blocked = index === 3;
        return (
          <g key={label}>
            <circle
              cx={cx}
              cy={TOP}
              r="10"
              fill={blocked ? 'rgba(212,85,107,0.22)' : 'rgba(20,194,172,0.18)'}
              stroke={blocked ? '#d4556b' : '#14c2ac'}
              strokeWidth="1.5"
            />
            <text
              x={cx}
              y={TOP + 4}
              fontSize="9"
              textAnchor="middle"
              fill="#f4f8fb"
              fontFamily="monospace"
            >
              {index + 1}
            </text>
            <text x={cx} y={TOP + 26} fontSize="10" textAnchor="middle" fill="rgba(244,248,251,0.8)">
              {label}
            </text>
          </g>
        );
      })}
      <text x={LEFT + GAP * 3} y={TOP - 20} fontSize="10" textAnchor="middle" fill="#f0a6b3">
        阻断点
      </text>
      <text x="0" y={TOP + 66} fontSize="11" fill="rgba(244,248,251,0.72)">
        已发布指针
      </text>
      <rect
        x="0"
        y={TOP + 76}
        width={WIDTH - 6}
        height="34"
        rx="8"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.22)"
      />
      <text
        x="12"
        y={TOP + 97}
        fontSize="12"
        fill="#f4f8fb"
        fontFamily="monospace"
        data-testid="home-stage-pointer-release"
        data-pointer={pointerRelease}
      >
        {pointerRelease}
      </text>
      <text
        x={WIDTH - 16}
        y={TOP + 97}
        fontSize="10"
        textAnchor="end"
        fill="rgba(244,248,251,0.78)"
      >
        阻断时保持不变
      </text>
      <text x="0" y={TOP + 130} fontSize="10" fill="rgba(244,248,251,0.62)">
        只有门禁放行，指针才推进到新快照。
      </text>
    </svg>
  );
}
