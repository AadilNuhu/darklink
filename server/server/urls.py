"""
URL configuration for server project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.urls import path

from chat_app.views import (
    RoomAdminView,
    RoomCollectionView,
    RoomEndView,
    RoomJoinView,
    RoomMessageHistoryView,
    RoomPromoteMemberView,
    RoomRevokeAdminView,
)

urlpatterns = [
    path("api/rooms/", RoomCollectionView.as_view(), name="room-collection"),
    path(
        "api/rooms/<str:session_code>/join/",
        RoomJoinView.as_view(),
        name="room-join",
    ),
    path(
        "api/rooms/<str:session_code>/messages/",
        RoomMessageHistoryView.as_view(),
        name="room-message-history",
    ),
    path(
        "api/rooms/<str:session_code>/admin/",
        RoomAdminView.as_view(),
        name="room-admin",
    ),
    path(
        "api/rooms/<str:session_code>/admin/end/",
        RoomEndView.as_view(),
        name="room-end",
    ),
    path(
        "api/rooms/<str:session_code>/admin/members/<str:username>/promote/",
        RoomPromoteMemberView.as_view(),
        name="room-promote-member",
    ),
    path(
        "api/rooms/<str:session_code>/admin/members/<str:username>/revoke/",
        RoomRevokeAdminView.as_view(),
        name="room-revoke-admin",
    ),
]
