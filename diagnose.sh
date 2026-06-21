#!/bin/bash
# Run from Roomies root — pastes key diagnostic info
echo "=== NAVBAR IMPORTS IN APP.JS ==="
grep -n "Navbar\|navbar\|hm-nav\|navbar2" client/src/App.js

echo ""
echo "=== ALL .navbar / .hm-nav / .navbar2 CSS RULES (line numbers) ==="
grep -n "\.navbar\|\.hm-nav\|\.navbar2\|--navbar-height" client/src/App.css | head -60

echo ""
echo "=== LAST 80 LINES OF APP.CSS ==="
tail -80 client/src/App.css

echo ""
echo "=== NAVBAR.JS FIRST 10 LINES ==="
head -10 client/src/components/layout/Navbar.js
