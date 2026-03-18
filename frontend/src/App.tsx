function App() {
  return (
    <div style={{
      background: "#0b0f19",
      color: "white",
      minHeight: "100vh",
      fontFamily: "Arial"
    }}>
      {/* NAVBAR */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "20px",
        borderBottom: "1px solid #1f2937"
      }}>
        <h2>COP4331</h2>

        <div>
          <button style={{
            marginRight: "10px",
            padding: "8px 16px",
            background: "#1f2937",
            color: "white",
            border: "none",
            borderRadius: "5px"
          }}>
            Login
          </button>

          <button style={{
            padding: "8px 16px",
            background: "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: "5px"
          }}>
            Register
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <div style={{ padding: "40px" }}>
        <h1>Dashboard</h1>
        <p>Welcome to your COP4331 project app</p>
      </div>
    </div>
  );
}

export default App;