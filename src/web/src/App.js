import React from 'react';
import NavigationBar from './components/NavigationBar';
import ListComponent from './components/ListComponent';
import DetailComponent from './components/DetailComponent';

const App = () => {
  return (
    <div className="container mx-auto px-4">
      <NavigationBar />
      <div className="flex">
        <ListComponent />
        <DetailComponent />
      </div>
    </div>
  );
};

export default App;
