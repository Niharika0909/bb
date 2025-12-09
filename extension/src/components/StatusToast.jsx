import React from 'react';

export default function StatusToast({ message, type }) {
  return (
    <div className={`toast ${type}`}>
      {message}
    </div>
  );
}
