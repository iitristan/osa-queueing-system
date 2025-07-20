"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function AdminUsers() {
  // State for user profiles
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [dateAdded, setDateAdded] = useState("");

  // Load users from local storage on mount
  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
    setUsers(storedUsers);
  }, []);

  // Save users to local storage whenever the list changes
  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
  }, [users]);

  // Add a new user
  const addUser = () => {
    if (!name || !position) {
      alert("Please fill in all fields.");
      return;
    }

    const newUser = {
      id: Date.now().toString(), // Unique ID
      name,
      position,
      dateAdded: new Date().toLocaleDateString(), // Current date
    };

    setUsers([...users, newUser]);
    setName("");
    setPosition("");
    setDateAdded("");
  };

  // Remove a user
  const removeUser = (id) => {
    const updatedUsers = users.filter((user) => user.id !== id);
    setUsers(updatedUsers);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-[#111111] border-b-4 border-[#FCBF15]">
        <div className="container mx-auto p-4">
          <Image
            src="/osa_header.png"
            alt="UST Logo"
            width={500}
            height={200}
            className="p-3"
          />
        </div>
      </nav>

      {/* User Management Section */}
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-[#FCBF15] mb-6">User Profiles</h1>

        {/* Add User Form */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#FCBF15]"
            />
            <input
              type="text"
              placeholder="Position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#FCBF15]"
            />
          </div>
          <button
            onClick={addUser}
            className="mt-4 bg-[#FCBF15] text-white px-4 py-2 rounded-lg hover:bg-[#FFD700] transition-colors"
          >
            Add User
          </button>
        </div>

        {/* User List */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">User List</h2>
          {users.length === 0 ? (
            <p className="text-gray-600">No users added yet.</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex justify-between items-center p-4 border border-gray-300 rounded-lg"
                >
                  <div>
                    <p className="text-lg font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.position}</p>
                    <p className="text-sm text-gray-500">
                      Date Added: {user.dateAdded}
                    </p>
                  </div>
                  <button
                    onClick={() => removeUser(user.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}