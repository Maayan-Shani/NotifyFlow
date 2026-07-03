package com.example.notifyflowlibrary.model

class NotificationEvent {

    var messageId: String? = null
    var variantId: String? = null
    var userId: String? = null
    var country: String? = null

    var eventType: String? = null // IMPRESSION / CLICK

    override fun toString(): String {
        return "NotificationEvent(messageId=$messageId, variantId=$variantId, userId=$userId, country=$country, eventType=$eventType)"
    }
}