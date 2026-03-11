useEffect(() => {
  fetch(`http://localhost:5000/api/users/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(res => res.json()).then(setUser);
}, []);
