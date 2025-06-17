import React, { useState } from "react"
import SimpleChat from "./SimpleChat"

const Helper: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1000, backgroundColor: "white", borderRadius: "2%", padding: "20px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" }}>
      {isOpen ? (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            position: "relative",
          }}>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              position: "absolute",
              backgroundColor: "#ff5f5f",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "30px",
              height: "30px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            ✖
          </button>
          <SimpleChat />
        </div>
      ) : (
        <div
          onClick={() => setIsOpen(true)}
          style={{
            width: "40px",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            backgroundColor: "#f0f0f0",
            borderRadius: "50%",
            fontSize: "18px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          💬
        </div>
      )}
    </div>
  )
}

export default Helper
