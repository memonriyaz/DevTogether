import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

function prompt(term:any) {
  term.write("\r\n$ ");
}

function runCommand(socket:any, command:any) {
  if (socket) {
    socket.send(command);
  } else {
    console.warn("Cannot send command: socket is not available");
  }
}
const XTermComponent = ({ socket, onFilesUpdate }:any) => {
  // Pass URL as a prop
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = new Terminal({ cursorBlink: true }); // Optional customization
    const fitAddon = new FitAddon();

    // Add custom prompt method
    (term as any).prompt = () => {
      term.write("\r\n$ ");
    };
    prompt(term as any);

    // Check if socket exists before setting onmessage
    if (socket) {
      socket.onmessage = (event:any) => {
        // console.log("the socket event ", event);
        try {
          const parsedData = JSON.parse(event.data);
          console.log("parsed data ", parsedData);
          if (parsedData.isTerminal) {
            term.write(parsedData.data);
          } else if (parsedData.isExplorer && onFilesUpdate) {
            onFilesUpdate(parsedData.data);
          }
        } catch (error) {
          console.error("Error parsing socket data:", error);
        }
      };
    } else {
      console.warn("Socket is not available for terminal");
    }

    term.loadAddon(fitAddon);
    // term.loadAddon(attachAddon);

    // Handle output (optional)
    // term.onData((data) => {
    //   console.log("Terminal output:", data);
    // });

    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
    }

    // Only set up key handler if socket exists
    if (socket) {
      term.onKey((key:any) => {
        runCommand(socket, key.key);
      });
    }

    // Cleanup on unmount
    return () => {
      (term as any).dispose();
    };
  }, [socket, onFilesUpdate]); // Add dependencies

  // If socket is not available, show a message
  if (!socket) {
    return (
      <div style={{ width: "100%", height: "100%", backgroundColor: "#191919", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc" }}>
        <p>Connecting to terminal...</p>
      </div>
    );
  }

  return (
    <div
      ref={terminalRef}
      style={{ width: "100%", height: "100%", backgroundColor: "#191919" }}
    />
  );
};

export default XTermComponent;