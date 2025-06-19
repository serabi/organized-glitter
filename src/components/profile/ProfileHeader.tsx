import React from 'react';

const ProfileHeader: React.FC = () => {
  return (
    <div className="mb-8">
      <div className="flex w-full flex-col">
        <h1 className="text-3xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>
    </div>
  );
};

export default ProfileHeader;
