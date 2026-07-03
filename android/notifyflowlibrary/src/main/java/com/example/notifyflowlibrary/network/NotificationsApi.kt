package com.example.notifyflowlibrary.network

import com.example.notifyflowlibrary.model.NotificationEvent
import com.example.notifyflowlibrary.model.NotificationMessage
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface NotificationsApi {

    @GET("sdk/messages")
    fun loadMessages(
        @Query("apiKey") apiKey: String,
        @Query("userId") userId: String,
        @Query("country") country: String,
        @Query("androidVersion") androidVersion: Int
    ): Call<ArrayList<NotificationMessage>>

    @POST("sdk/events/impression")
    fun sendImpression(
        @Body event: NotificationEvent
    ): Call<Void>

    @POST("sdk/events/click")
    fun sendClick(
        @Body event: NotificationEvent
    ): Call<Void>
}