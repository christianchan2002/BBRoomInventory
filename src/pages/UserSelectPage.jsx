function UserSelectPage({ users, selectedUser, setSelectedUser, onStartSession, onBack }) {
  return (
    <section className="page pageWithFooter">
      <header className="pageHeader">
        <button className="backButton" onClick={onBack} aria-label="Go back">
          Back
        </button>
        <h1 className="pageTitle">Select User</h1>
      </header>

      <div className="pageBodyCompact">
        <label className="fieldLabel" htmlFor="user-select">
          Name
        </label>
        <select
          id="user-select"
          className="fieldInput"
          value={selectedUser}
          onChange={(event) => setSelectedUser(event.target.value)}
        >
          <option value="">Select your name</option>
          {users.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>
      </div>

      <footer className="fixedFooter">
        <button
          className="ctaButton"
          disabled={!selectedUser}
          onClick={onStartSession}
        >
          Start Session
        </button>
      </footer>
    </section>
  );
}

export default UserSelectPage;
