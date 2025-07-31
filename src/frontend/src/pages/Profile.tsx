import React, { useState } from 'react';

const Profile: React.FC = () => {
  const [user, setUser] = useState({
    username: 'admin',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'Administrator',
    joinDate: '2023-11-15',
    bio: 'PowerShell administrator and script maintainer'
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...user });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally call an API to update the user profile
    setUser(formData);
    setIsEditing(false);
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Profile</h1>
      
      <div className="bg-gray-700 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Profile Image */}
          <div className="w-full md:w-1/4 flex flex-col items-center">
            <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4">
              {user.username.charAt(0).toUpperCase()}
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition w-full"
              >
                Edit Profile
              </button>
            ) : null}
          </div>
          
          {/* Profile Details */}
          <div className="w-full md:w-3/4">
            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
                  <p className="text-gray-400">{user.role}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Username</p>
                    <p>{user.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p>{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Member Since</p>
                    <p>{new Date(user.joinDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Bio</p>
                  <p>{user.bio}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm text-gray-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="bio" className="block text-sm text-gray-400 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({ ...user });
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      
      {/* Activity Section */}
      <div className="mt-8 bg-gray-700 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="text-gray-300">Uploaded script: <span className="text-blue-400">Get-SystemInfo.ps1</span></p>
            <p className="text-sm text-gray-400">2 days ago</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <p className="text-gray-300">Executed script: <span className="text-blue-400">Backup-UserData.ps1</span></p>
            <p className="text-sm text-gray-400">5 days ago</p>
          </div>
          <div className="border-l-4 border-yellow-500 pl-4 py-2">
            <p className="text-gray-300">Modified script: <span className="text-blue-400">New-ADUserBulk.ps1</span></p>
            <p className="text-sm text-gray-400">1 week ago</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;