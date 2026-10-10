// 这里的内容取自新项目 python-lab/README.md 与本机 pytest 记录，
// 只保留公开、可核实的端点、命令与性质描述；不包含任何私有背景或私有代码。

export const PY_LAB_TITLE = 'python-lab（FastAPI 本地实验）';

export const PY_LAB_SUMMARY =
  '独立的本地 Python 实验，用真实可运行的代码演示同一个工程问题：数据更新之后，不能发布针对旧数据版本算出的研究结果。';

export interface PyLabEndpoint {
  readonly method: string;
  readonly path: string;
  readonly note: string;
}

export const PY_LAB_ENDPOINTS: readonly PyLabEndpoint[] = [
  { method: 'GET', path: '/health', note: '存活检查与执行模式声明' },
  { method: 'POST', path: '/demo/runs', note: '运行流水线，必须带 Idempotency-Key 头' },
  { method: 'GET', path: '/demo/runs/{run_id}', note: '读取单条已存回执' },
  { method: 'GET', path: '/demo/runs', note: '按时间倒序列出回执（limit 1–50）' },
  { method: 'GET', path: '/demo/published', note: '当前已发布指针，或 null' },
] as const;

export const PY_LAB_COMMANDS: readonly string[] = [
  'cd python-lab',
  'python -m venv .venv',
  '.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt',
  '.\.venv\Scripts\python.exe -m pip install -e .',
  '.\.venv\Scripts\python.exe -m pytest -q',
  '.\.venv\Scripts\python.exe -m demo_lab --port 8001',
  '.\.venv\Scripts\python.exe scripts/live_smoke.py',
] as const;

export interface PyLabProperty {
  readonly testId: string;
  readonly title: string;
  readonly body: string;
}

export const PY_LAB_PROPERTIES: readonly PyLabProperty[] = [
  {
    testId: 'python-lab-property-idempotency',
    title: '幂等重放',
    body: 'POST /demo/runs 要求 Idempotency-Key。用同一 key 与同一 payload 重放，返回完全相同的已存回执：不新增运行，也不产生第二次发布。',
  },
  {
    testId: 'python-lab-property-conflict',
    title: '409 冲突',
    body: '同一 key 换成不同 payload 会被拒绝，返回 HTTP 409，并指出该 key 当前归属的 run，避免一个 key 绑定两份不同请求。',
  },
  {
    testId: 'python-lab-property-digest',
    title: '摘要校验',
    body: '数据版本不是手填标签：数据集用规范化 JSON（键排序、紧凑分隔）序列化后取 SHA-256。相同 seed 必然得到相同版本，不同 seed 得到不同版本；调用方还可以传 expected_data_version 做断言。',
  },
  {
    testId: 'python-lab-property-pointer',
    title: '失败指针不变',
    body: '门禁把研究声明的输入版本与当前数据版本对比。不匹配时运行 blocked，已发布指针逐字节保留，旧快照不会被重新贴上新的数据日期；被阻断的运行同样入库，拒绝过程可审计。',
  },
] as const;

export const PY_LAB_STAGES =
  'data_generate → data_validate → version_check → research → gate → candidate → publish';

export const PY_LAB_LIMITATION =
  '内存单进程局限：运行、幂等回执与发布指针都只存在一个进程的内存字典里，重启即清空；锁是进程内的，多 worker 会各自持有独立 store，因此该设计在构造上就是单进程；阶段是同一个请求处理器里的函数调用，不是工作流引擎，也不测量阶段耗时。所以本实验不作为队列化生产能力的证明。';

export const PY_LAB_VERIFICATION = {
  command: '.\.venv\Scripts\python.exe -m pytest -q',
  /** 独立 QA 复验的字面结果（本条为独立复核值，不是本目录自报） */
  literal: '72 passed, 1 warning in 1.77s',
  /** 用例数与告警数单独列出，避免把 1 条告警读成「零告警」 */
  passed: 72,
  warnings: 1,
  exitCode: 0,
  pytest: '9.1.1',
  python: '3.12.10 / Windows',
  /** 独立复验日期（Asia/Shanghai） */
  verifiedDate: '2026-10-10',
  /** 告警来源：第三方弃用提示，不来自本实验代码 */
  warningNote:
    '当前那 1 条 warning 是第三方弃用提示（starlette.testclient 关于 httpx 的 StarletteDeprecationWarning），由依赖发出、不来自本实验代码，因此不是「零告警」。',
  /** 耗时口径：单次挂钟时长，不作性能声明 */
  timingNote:
    '耗时是单次运行的挂钟时长，随机器与负载波动（本机多次运行落在约 1.2–1.8 秒区间），不是性能指标，也不是生产性能声明。',
  liveSmoke:
    'scripts/live_smoke.py 需要本机先启动 8001 端口的服务再运行（对真实 uvicorn 进程做 12 项 HTTP 检查：发布、重放、冲突、各阻断场景、指针冻结与输入校验）。',
} as const;

export const PY_LAB_DECOUPLING =
  '两层互不调用：静态前端不向该服务发任何请求；该服务也没有安装 CORS 中间件，因为设计上不面向浏览器来源。';
