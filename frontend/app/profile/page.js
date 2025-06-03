import React from 'react';

const profile = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.message}>Still working on it</h1>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f0f0f0',
  },
  message: {
    fontSize: '2rem',
    color: '#333',
  },
};

export default profile;
