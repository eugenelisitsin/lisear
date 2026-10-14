#!/usr/bin/env python3
"""Local development server for www/ that never lets the browser cache anything.
Usage: python3 tools/serve.py [port]   (default 8812), then open http://localhost:8812/"""
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'www'))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8812
http.server.ThreadingHTTPServer(('', port), NoCache).serve_forever()
