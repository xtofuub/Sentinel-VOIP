# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

# Sentinel VOIP

A modern, tactical prank call and call management web application built with React, Vite, Tailwind CSS, and shadcn/ui. Sentinel VOIP enables users to launch spoofed calls, manage disposable identities, and review recorded calls in a sleek, dark, and professional interface inspired by 21st.dev design principles.

## Features

- **Launch Call:**
  - Fill in a name, phone number, language, and prank scenario.
  - Each call uses a new, disposable identity (DID/UID) for privacy and bypassing backend restrictions.
  - Real-time feedback and error handling.

- **Recorded Calls Panel:**
  - View all running, accepted, and declined calls across all generated accounts.
  - Save or delete recordings directly from the UI.
  - Copy/share call links with one click.

- **Modern UI:**
  - Flat, dark, and minimal design using shadcn/ui and 21st.dev component patterns.
  - Responsive layout for desktop and mobile.
  - No glassmorphism or glossy effects—just clean, accessible, and professional.

- **Tech Stack:**
  - React + Vite for fast development and HMR
  - Tailwind CSS for utility-first styling
  - shadcn/ui for accessible, composable UI primitives
  - Framer Motion for subtle animations
  - Lucide React for icons

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/xtofuub/Sentinel-VOIP.git
   cd Sentinel-VOIP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:5173](http://localhost:5173)

## Project Structure

- `/src/components/ui/` — All UI primitives and custom components (shadcn/21st.dev style)
- `/src/components/` — App-specific panels and logic (e.g., RecordedCallsPanel)
- `/src/services/` — API logic and identity management
- `/src/App.jsx` — Main application shell
- `/src/index.css` — Tailwind and theme setup

## Customization
- **Prank Scenarios:** Add or modify prank templates in the backend or via the prank list logic.
- **Branding:** Update the hero section, logo cloud, and header for your organization or use case.

## Credits
- UI inspired by [shadcn/ui](https://ui.shadcn.com/) and [21st.dev](https://21st.dev/)
- Icons by [Lucide](https://lucide.dev/)
- Animations by [Framer Motion](https://www.framer.com/motion/)

## License

MIT License. See [LICENSE](LICENSE) for details.
