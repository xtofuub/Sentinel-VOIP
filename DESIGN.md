# Design

## Overview

Sentinel-VOIP uses a dark, tinted-neutral product UI with a restrained rose accent. The physical scene is a researcher reviewing audio scenario data on a large monitor in a dim lab, so the theme stays dark to reduce glare while preserving strong contrast.

## Color

Use OKLCH tokens where possible. The base surface is not pure black; it is a warm, red-tinted near-black. Rose is the primary accent for selected states, primary actions, and active indicators. Amber, green, and rose variants are reserved for warning, success, and error states.

## Typography

Use Inter as the product font. Headings are compact, uppercase only where the surrounding UI already establishes a command-console tone. Body copy should stay sentence case and readable at 65 to 75 characters.

## Components

Navigation is fixed, translucent, and compact. Panels use tinted surfaces, subtle full borders, and soft shadows. Buttons use consistent rounded rectangles or pills, with visible hover, active, and focus states. Avoid new one-off controls when shared utility classes can express the same pattern.

## Layout

Use wide desktop layouts for the dashboard and catalog, but preserve comfortable mobile padding. Keep primary actions near configuration inputs. Catalog cards should have consistent heights, clear image ratios, readable metadata, and accessible empty/loading states.

## Motion

Transitions should be short, 150 to 250ms, and mostly affect opacity, color, box-shadow, and transforms. Avoid decorative bounce. Respect `prefers-reduced-motion`.
