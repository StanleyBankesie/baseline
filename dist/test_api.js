import fetch from 'node-fetch'; // wait, no, I'll just use http.
import http from 'http';

http.get('http://localhost:5000/api/transport/trips/2/locations', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', (err) => console.log("Error: ", err.message));
