import React from 'react';

export type NavTab = 'user' | 'gov' | 'police' | 'hospital';

interface TopRightNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const TopRightNav: React.FC<TopRightNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: NavTab[] = ['user', 'gov', 'police', 'hospital'];

  return (
    <div className="top-right-nav">
      {tabs.map((tab) => (
        <div
          key={tab}
          className={`nav-item ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </div>
      ))}
    </div>
  );
};

export default TopRightNav;
