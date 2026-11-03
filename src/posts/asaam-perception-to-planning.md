---
title: "ASAAM: connecting perception, maps, and motion"
slug: asaam-perception-to-planning
date: 2026-11-03
summary: "A look at the perception and mapping side of ASAAM, and the work of connecting what an aerial robot sees to the path it can take."
tags: [Project notes, Aerial autonomy, Semantic mapping]
draft: false
image: /images/writing/asaam-teaser.svg
imageAlt: "Concept illustration of an aerial robot following a route through a semantic 3D scene, connecting perception, mapping, and planning."
---
An aerial robot needs more than a good prediction for one image. It needs to connect observations over time, represent the space around it, and make that representation useful for the next decision.

That connection is what interests me in **ASAAM**. The project brings together Nanyang Technological University in Singapore and the Fraunhofer Institutes IVI, IEM, and IOSB to investigate safer, scalable advanced air mobility. Its scope connects sensing and data fusion with trajectory planning and flight control, including take-off and landing.

## From a scene to a representation

The perception and mapping work gives the system a way to describe its surroundings. Images and other sensor observations become estimates of scene content; fusion brings these estimates together; a semantic 3D representation connects them to geometry.

In our shared software stack, this is the connection between perception, fusion, and **Radix-based semantic voxel mapping**. A downstream planner can use the resulting map to reason about a path through the environment.

The interfaces matter as much as the individual algorithms. A map needs a clear coordinate frame, a meaningful representation of occupied and unknown space, and an update path that its consumer can use.

## Making the pieces work together

For ASAAM, the project context connects this stack to perception, tracking, trajectory planning, and flight-control integration. These are related responsibilities, but they are not interchangeable: producing a semantic map does not by itself establish a complete tracking system or a flight-ready planner.

The work I want to share here is the process of bringing those pieces together: checking the data that enters the pipeline, understanding the map that comes out, and making the hand-off to downstream components explicit.

That also means evaluating the integrated system on relevant scenarios, rather than treating a model score as evidence that the whole chain works.

## What I’ll explore here

- How semantic information becomes useful in a geometric map.
- How mapping and planning exchange information as the scene changes.
- What makes an integrated perception pipeline easier to inspect, test, and improve.

This is an introduction to ongoing work. The teaser is a concept illustration; it does not show a measured result or an operational flight.

## Project context

The public overview is available on [Fraunhofer IVI’s autonomous flying page](https://www.ivi.fraunhofer.de/en/research-fields/advanced-air-mobility/autonomous-flying.html). This note focuses on the perception-to-mapping connection within the larger collaboration.
