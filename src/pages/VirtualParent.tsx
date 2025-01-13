import React from 'react';
import ChatBot from '../components/ChatBot';

export default function VirtualParent() {
  return <ChatBot isParentMode={true} />;
}
