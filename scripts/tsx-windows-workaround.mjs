// Some sandboxed Windows hosts cannot resolve os.userInfo(), which tsx uses
// only to name its temporary cache directory. A stable numeric identity keeps
// the test runner deterministic without changing application behavior.
if (typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}
