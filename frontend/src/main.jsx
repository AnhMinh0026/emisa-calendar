import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConfigProvider } from 'antd'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1D1D1F', // Đen quyền lực Apple
          colorBgLayout: '#F5F5F7', // Nền xám bạc Apple
          colorTextBase: '#1D1D1F', // Chữ xám than
          borderRadius: 8, // Bo góc mềm mại
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        components: {
          Button: {
            controlHeight: 40, // Nút to, dễ bấm
            borderRadius: 8,
          },
          Table: {
            borderRadius: 12, // Bảng bo góc lớn hơn một chút
          },
          Card: {
            borderRadius: 12,
          },
          Menu: {
            itemSelectedColor: '#FFFFFF',
            itemSelectedBg: '#1D1D1F',
            itemHoverColor: '#FFFFFF',
            itemHoverBg: 'rgba(29, 29, 31, 0.8)',
          },
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
