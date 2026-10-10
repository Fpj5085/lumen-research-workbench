export function AppFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span>LUMEN · 合成研究工作台</span>
        <span>全部标的、价格、榜单、账户与运行记录均为独立构造的模拟数据</span>
        <span>
          快照 ID 采用本演示自有命名 demo-snapshot-NNN；示例日期取自虚构日历，非实际交易日，
          也不对应任何外部批次日期
        </span>
        <span>前端为离线静态站点，不连接任何 Python 服务或真实行情源</span>
      </div>
    </footer>
  );
}
