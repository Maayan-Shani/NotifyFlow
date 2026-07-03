package com.example.notifyflowlibrary.network

import android.util.Log
import com.example.notifyflowlibrary.model.NotificationEvent
import com.example.notifyflowlibrary.model.NotificationMessage
import com.google.gson.GsonBuilder
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class NotificationsController {

    interface MyCallback<T> {
        fun onSuccess(data: T)
        fun onError(message: String?)
    }

    companion object {
        private const val TAG = "NotificationsController"
    }

    private var baseUrl: String? = null
    private var notificationsApi: NotificationsApi? = null

    fun setBaseUrl(baseUrl: String) {
        val normalizedBaseUrl = normalizeBaseUrl(baseUrl)

        if (this.baseUrl == normalizedBaseUrl && notificationsApi != null) {
            Log.d(TAG, "Base URL already configured. Reusing existing Retrofit API: $normalizedBaseUrl")
            return
        }

        this.baseUrl = normalizedBaseUrl
        this.notificationsApi = null

        Log.d(TAG, "Base URL configured: ${this.baseUrl}")
    }

    private fun normalizeBaseUrl(baseUrl: String): String {
        return if (baseUrl.endsWith("/")) {
            baseUrl
        } else {
            "$baseUrl/"
        }
    }

    private fun getNotificationsApi(): NotificationsApi {
        val existingApi = notificationsApi

        if (existingApi != null) {
            return existingApi
        }

        val currentBaseUrl = baseUrl
            ?: throw IllegalStateException(
                "Base URL is not configured. Call NotifyFlow.init(...) first."
            )

        val gson = GsonBuilder()
            .setLenient()
            .create()

        val retrofit = Retrofit.Builder()
            .baseUrl(currentBaseUrl)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()

        val createdApi = retrofit.create(NotificationsApi::class.java)

        notificationsApi = createdApi

        Log.d(TAG, "Retrofit API created for baseUrl: $currentBaseUrl")

        return createdApi
    }

    fun getMessages(
        apiKey: String,
        userId: String,
        country: String,
        androidVersion: Int,
        callback: MyCallback<ArrayList<NotificationMessage>>?
    ) {
        if (callback == null) {
            return
        }

        val call = getNotificationsApi().loadMessages(
            apiKey = apiKey,
            userId = userId,
            country = country,
            androidVersion = androidVersion
        )

        call.enqueue(object : Callback<ArrayList<NotificationMessage>> {
            override fun onResponse(
                call: Call<ArrayList<NotificationMessage>>,
                response: Response<ArrayList<NotificationMessage>>
            ) {
                if (!response.isSuccessful) {
                    callback.onError(response.message())
                    return
                }

                val messages = response.body()

                if (messages == null) {
                    callback.onError("Messages response body is null")
                    return
                }

                Log.d(TAG, "Messages loaded from server: ${messages.size}")
                callback.onSuccess(messages)
            }

            override fun onFailure(
                call: Call<ArrayList<NotificationMessage>>,
                throwable: Throwable
            ) {
                callback.onError(throwable.message)
            }
        })
    }

    fun sendImpression(
        event: NotificationEvent,
        callback: MyCallback<Void?>?
    ) {
        val call = getNotificationsApi().sendImpression(event)

        call.enqueue(object : Callback<Void> {
            override fun onResponse(
                call: Call<Void>,
                response: Response<Void>
            ) {
                if (!response.isSuccessful) {
                    callback?.onError(response.message())
                    return
                }

                Log.d(TAG, "Impression stats sent successfully")
                callback?.onSuccess(null)
            }

            override fun onFailure(
                call: Call<Void>,
                throwable: Throwable
            ) {
                callback?.onError(throwable.message)
            }
        })
    }

    fun sendClick(
        event: NotificationEvent,
        callback: MyCallback<Void?>?
    ) {
        val call = getNotificationsApi().sendClick(event)

        call.enqueue(object : Callback<Void> {
            override fun onResponse(
                call: Call<Void>,
                response: Response<Void>
            ) {
                if (!response.isSuccessful) {
                    callback?.onError(response.message())
                    return
                }

                Log.d(TAG, "Click stats sent successfully")
                callback?.onSuccess(null)
            }

            override fun onFailure(
                call: Call<Void>,
                throwable: Throwable
            ) {
                callback?.onError(throwable.message)
            }
        })
    }
}